const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  transactions: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
    // unique: true,
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
  },
  verified: {
    type: Boolean,
  },
  verified: {
    type: Array,
    
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("user", userSchema);
