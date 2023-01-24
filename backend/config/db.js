const mongoose = require('mongoose');
require("dotenv/config")
module.exports.connect= function(){
    try{
        mongoose.connect(process.env.CONNECTION_STRING,()=>{
            console.log("connection successfull")
        })
    }catch(err){
        console.log(err)
    }
}