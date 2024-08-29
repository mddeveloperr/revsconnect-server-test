const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
    unique: true,
  },
  accountNumber: {
    type: Number,
    // require: true,
    // unique: true,
  },
  password: {
    type: String,
    require: true,
  },
  address: {
    type: String,
    require: true,
    ensureIndexes:true,
    unique: true
  },
  resetToken: {
    type: String,
  },
  transactions:{
    type:Array
  },
  details:{
    type:Array
  },
 
  verified: {
    type: Boolean,
  },
  role: { 
      type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
 
});

module.exports = mongoose.model("user", userSchema);
