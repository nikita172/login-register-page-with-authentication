const express = require("express")
const db = require("./config/db")
db.connect();
const User = require("./models/User");
const UserVerification = require("./models/UserVerification")
const PasswordReset = require("./models/PasswordReset")
const app = express();
const port = 5000;
require("dotenv").config();
const path = require("path")
const bodyParser = require("express").json;
app.use(bodyParser());
//node mailer config
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt")
const transporter = nodemailer.createTransport({
    host: "mail.nikitarawat.site",
    port: 465,
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    },
});

//testing nodemailer success
transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready for messages");
        console.log(success);
    }
})

app.post("/sendmail", (req, res) => {
    const { subject, to, message } = req.body;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: to,
        subject: subject,
        text: message
    }

    transporter.sendMail(mailOptions)
        .then(() => {
            res.json({
                status: "SUCCESS",
                message: "Message sent successfully."
            })
        })
        .catch((err) => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured"
            })
        })
})

app.post("/user/signup", (req, res) => {
    const { email, password, name } = req.body;
    User.find({ email })
        .then((result) => {
            if (result.length) {
                res.json({
                    status: "FAILED",
                    message: "User already exist"
                })
            } else {
                bcrypt.hash(password, 10)
                    .then((hashedPassword) => {
                        const newUser = new User({
                            name,
                            email,
                            password: hashedPassword,
                            verified: false
                        })
                        newUser.save().then((result) => {
                            sendVerificationEmail(result, res);
                        }).catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occured while saving user account!"
                            })
                        })
                    }).catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occured while hashing password!"
                        })
                    })
            }
        }).catch(err => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user!"
            })
        })
})

const sendVerificationEmail = ({ _id, email }, res) => {
    const currentUrl = "http://localhost:5000/";
    const uniqueString = uuidv4() + _id;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify your email",
        html: `<p>Verify your email address to complete the signup and login into you account. </p><p>This link <b> expires in 6 hours.</b></p><p>Press<a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}> here </a>to proceed. </p>`
    }
    bcrypt.hash(uniqueString, 10)
        .then(hashedUniqueString => {
            const newVerification = new UserVerification({
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now() + 21600000
            })
            newVerification.save()
                .then(result => {
                    transporter.sendMail(mailOptions)
                        .then(() => {
                            res.json({
                                status: "PENDING",
                                message: "verifcation email sent successfully."
                            })
                        })
                        .catch((err) => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "verification email failed"
                            })
                        })
                })
                .catch(err => {
                    console.log(err);
                    res.json({
                        status: "FAILED",
                        message: "An error occured while saving verification data!"
                    })
                })
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occured while hashing email data!"
            })
        })
}

//verify email
app.get("/user/verify/:userId/:uniqueString", (req, res) => {   
    const { userId, uniqueString } = req.params;
    UserVerification.find({ userId })
        .then(result => {
            if (result.length > 0) {
                //user verification record exist so we can proceed
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;
                if (expiresAt < Date.now()) {
                    //record has expired so we delete it.
                    UserVerification.deleteOne({ userId })
                        .then(result => {
                            User.deleteOne({ _id: userId })
                                .then(() => {
                                    let message = "Link has expired. Please sign up again";
                                    res.redirect(`/user/verified/?error=true&message=${message}`)
                                })
                                .catch(err => {
                                    console.log(err);
                                    let message = "clearing user with expired unique string failed";
                                    res.redirect(`/user/verified/?error=true&message=${message}`)
                                })
                        })
                        .catch(err => {
                            console.log(err);
                            let message = "An error occured while clearing expired user verification record";
                            res.redirect(`/user/verified/?error=true&message=${message}`)
                        })
                } else {
                    // valid record exist so we validate the user string
                    //first compare the hashed unique string
                    bcrypt.compare(uniqueString, hashedUniqueString)
                        .then(result => {
                            if (result) {
                                //string matches
                                User.updateOne({ _id: userId }, { verified: true })
                                    .then(() => {
                                        UserVerification.deleteOne({ userId })
                                            .then(() => {
                                                console.log("this")
                                                
                                                res.sendFile(path.join(__dirname, "./views/verified.html"))
                                            })
                                            .catch(err => {
                                                console.log(err);
                                                let message = "An error occured while finalizing successfull userverification";
                                                res.redirect(`/user/verified/?error=true&message=${message}`)
                                            })
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        let message = "An error occured while updating user record to show verified";
                                        res.redirect(`/user/verified/?error=true&message=${message}`)
                                    })
                            } else {
                                //record exist but incorrect verification details
                                let message = "incorrect verification details passed. check you inbox.";
                                res.redirect(`/user/verified/?error=true&message=${message}`)
                            }
                        })
                        .catch(err => {
                            let message = "An error occured while comparing unique string";
                            res.redirect(`/user/verified/?error=true&message=${message}`)
                        })
                }
            } else {
                //user verification record doesn't exist
                let message = "account record doesn't exist or has been verified already. please signup or login in";
                res.redirect(`/user/verified/?error=true&message=${message}`)
            }
        })
        .catch(err => {
            console.log(err);
            let message = "An error occured while checking for existing user verification record";
            res.redirect(`/user/verified/?error=true&message=${message}`)
        })
})

//verify page route
app.get("/user/verified", (req, res) => {
    console.log("hello")
    res.sendFile(path.join(__dirname, "./views/verified.html"))
})

app.post("/user/signin", (req, res) => {
    const { email, password } = req.body;
    User.find({ email })
        .then(data => {
            if (data.length) {
                //user exist
                if (!data[0].verified) {
                    res.json({
                        status: "FAILED",
                        message: "Email has not been verified yet. Check your inbox!",
                    })
                }
                else {
                    const hashedPassword = data[0].password;
                    bcrypt.compare(password, hashedPassword)
                        .then(result => {
                            if (result) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "signin successfull",
                                    data: data
                                })
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Invalid password entered!",
                                })
                            }
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occured while comparing passwords",
                            })
                        })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!",
                })
            }
        })
        .catch(error => {
            console.log(error)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user!",
            })
        })
})

//reset password stuff
app.post("/user/requestPasswordReset",(req,res)=>{
    const {email, redirectUrl} = req.body;
    //check if email exist or not
    User.find({email})
    .then(data=>{
        if(data.length){
            //check if the user is verified
            if(!data[0].verified){
                res.json({
                    status:"FAILED",
                    message:"Email hasn't been verified yet. check your inbox"
                })

            }else{
                //proceed with email to reset password
                sendEmailReset(data[0],redirectUrl,res)
            }

        }else{
            res.json({
                status:"FAILED",
                message:"No account find with supplied email"
            })
        }
    })
    .catch(err=>{
        console.log(err);
        res.json({
            status:"FAILED",
            message:"An error occured while checking for existing email"
        })
    })

})
 
// send password reset email
const sendEmailReset =({_id,email}, redirectUrl,res)=>{
    const resetString = uuidv4()+_id;

    //clear the existing reset password record
    PasswordReset.deleteMany({userId:_id})
    .then(result =>{
        //reset records deleted successfully
        //now we send the email
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Password Reset",
            html: `<p>We heard that you lost the password. </p>
            <p>Dont worry use the below link to reset it.</p>
            <p>This link <b> expires in 60 minutes.</b></p><p>Press<a href=${redirectUrl+ _id + "/" + resetString}> here </a>to proceed. </p>`
        }

        bcrypt.hash(resetString, 10)
        .then(hashedResetString=>{
            // set values in password reset collection
            const newPasswordReset = new PasswordReset({
                userId:_id,
                resetString:hashedResetString,
                createdAt:Date.now(),
                expiresAt:Date.now()+3600000
            })
            newPasswordReset.save()
            .then(()=>{
                transporter.sendMail(mailOptions)
                .then(()=>{
                    //reset email sent and password reset record saved
                    res.json({
                        status:"PENDING",
                        message:"Password reset email sent"
                    })
                })
                .catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"An error occured while sending the mail for reset password"
                    })
                })
            })
            .catch(err=>{
                console.log(err);
                res.json({
                    status:"FAILED",
                    message:"An error occured while hashing the password reset data"
                })
            })
        })
        .catch(err=>{
            res.json({
                status:"FAILED",
                message:"An error occured while hashing the reset string"
            })
        })

    
    })
    .catch(err=>{
        res.json({
            status:"FAILED",
            message:"An error occured while deleting the existing reset password record"
        })
    })

}

//actually reset the password
app.post("/user/resetPassword", (req,res)=>{
    let{userId, resetString, newPassword}= req.body;
    PasswordReset.find({userId})
    .then(result =>{
        if(result.length){
            //password reset record exist so we proceed
            const {expiresAt}= result[0];
            //check for expires reset

            if(expiresAt<Date.now()){
                PasswordReset.deleteOne({userId})
                .then(()=>{
                    //reset record deleted successfully
                    res.json({
                        status:"FAILED",
                        message:"password reset link expired"
                    })
                })
                .catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"An error occured while deleting the expires reset password record"
                    })
                })
            }else{
                //valid reset record exist so we proceed
                //first we compare the hashed reset string
                bcrypt.compare(resetString,result[0].resetString)
                .then(result=>{
                    if(result){
                        //strings matched
                        //hash password and save to db
                        bcrypt.hash(newPassword,10)
                        .then(hashedNewPassword=>{
                            //update user password
                            User.updateOne({_id:userId},{password:hashedNewPassword})
                            .then(()=>{
                                //update complete. now delete reset record
                                PasswordReset.deleteOne({userId})
                                .then(()=>{
                                    //both user and password resetupdates
                                    res.json({
                                        status:"SUCCESS",
                                        message:"Password updated successfully"
                                    })
                                })
                                .catch(err=>{
                                    console.log(err)
                                    res.json({
                                        status:"FAILED",
                                        message:"An error occured while finalizing reset password."
                                    })
                                })

                            })
                            .catch(err=>{
                                res.json({
                                    status:"FAILED",
                                    message:"reset password failed"
                                })
                            })
                        })
                        .catch(err=>{
                            res.json({
                                status:"FAILED",
                                message:"An error occured while hashing the new password"
                            })
                        })

                    }else{
                        //incorrect reset string
                        res.json({
                            status:"FAILED",
                            message:"Incorrect reset string"
                        })
                        
                    }
                })
                .catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"An error occured while coparing the resetString "
                    })
                })
            }
        }else{
            res.json({
                status:"FAILED",
                message:" reset password record doesnot exist"
            })
        }
    })
    .catch(err=>{
        res.json({
            status:"FAILED",
            message:"An error occured while searching the existing reset password record"
        })
    })
})
app.listen(port, () => {
    console.log(`server running on port ${port}`);
})
