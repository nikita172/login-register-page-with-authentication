const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
    userId:String,
    resetString:String,  
    createdAt:Date,
    expiresAt:Date
})

const PasswordReset = mongoose.model("PasswordReset",passwordResetSchema)
module.exports =PasswordReset;