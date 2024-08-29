const Express = require("express");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const router = Express.Router();
const User = require("../models/Users");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const mailOption = require("../layouts/mail");
const fetchuser = require("../middleware/fetchUser.js");
const WldPrice=require("../blockchain/abis/wldPrice.js");


const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  debug: true,
  secureConnection: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  tls: {
    rejectAuthorized: true,
  },
});

router.post("/signUp", async (req, res) => {
  console.log("users details body",req.body)
  try {
    const email = req.body.email.toLowerCase();
    // For managing Unique email
    let userByEmail = await User.findOne({ email: email });
    let userByAddress = await User.findOne({ address: req.body.address });

    // let userByAddress = await User.findOne({ address: req.body.address });
    if (userByEmail || userByAddress) {
      return res
        .status(400)
        .send("User already exist on provided address or email");
    } else {
      // Add salt and generate hash of password
      const addSalt = await bcrypt.genSalt(5);
      const secPassword = await bcrypt.hash(req.body.password, addSalt);

      // Create User

      const instance = await User.create({
        name: req.body.name,
        email: email,
        password: secPassword,
        address: req.body.address,
        accountNumber: req.body.accountNumber,
        resetToken:"",
        verified: req.body.verified,

      });

      // notify on success

      if (instance) {
        const token = jwt.sign({ _id: instance._id }, process.env.JWT_SECRET);
        console.log(instance);
        return res.status(200).send({
          email: instance.email,
          name: instance.name,
          address: instance.address,
          token: token,
          account: instance.accountNumber,
          verified: instance.verified,
        });
      }
    }

    //catch error
  } catch (error) {
    console.error(error.message);
    res.status(500).send("some errors occur during SignUp");
  }
});

router.post("/login", async (req, res, next) => {
  //    const {error} =  loginValidation(req.body);
  const {  password } = req.body;
  const email = req.body.email.toLowerCase();

  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(400).send("User not registerd with this email ");
  } else {
    try {
      bcrypt
        .compare(password, user.password)
        .then((ress) => {
          if (ress) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
            res.cookie("authToken", token, {
              expires: new Date(Date.now() + 3600000),
            });
            return res.status(200).send({
              email: user.email,
              name: user.name,
              address: user.address,
              phone: user.phone,
              token: token,
              account: user.accountNumber,
              verified: user.verified,
              role: user?.role,
            });
          } else {
            return res.status(400).send("Invalid Credentials");
          }
        })
        .catch(() => {
          return res.status(400).send("Internal Erorr");
        });
    } catch (error) {
      next(error);
    }
  }
});

router.post("/addaccountnumber", async (req, res, next) => {
  const { email, account } = req.body;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(400).json({ error: "User not registered with this email" });

    }

    user.accountNumber = account;
    
    await user.save();

    return res.status(200).send({
      success: true,
      email: user.email,
      name: user.name,
      address: user.address,
      account: user.accountNumber,
      verified: user.verified,
      message:"Account Added Successfully"
    });
  } catch (error) {
    // Log the error or handle it appropriately
    console.error("Error updating account number:", error);
    return res.status(500).json({ error: "Internal Server Error" , success: false});

  }
});

router.get("/getUser", async (req, res) => {
  try {
    const userEmail = req.query.email; // Access email from query parameters
    console.log("email found ",userEmail);

    if (!userEmail) {
      return res.status(400).json("Email parameter is missing");
    }

    let user = await User.findOne({ email: userEmail });

    if (user) {
      return res.status(200).json(user);
    } else {
      return res.status(400).json("No user found");
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json("Server Error!");
  }
});


// Handle the form submission and send a password reset email
router.post('/forgot-password', async (req, res) => {
  try {

    const email = req.body.email.toLowerCase();
    // console.log("------------", email);
    // Check if the email exists in your database
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send("Email not found. Please check your email address.");
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(20).toString("hex");


    // Update the user document with the reset token
    await User.updateOne({ email }, { resetToken });

    console.log("Reset Token is:", resetToken);

    // Compose the password reset email
    const resetPasswordLink = `https://www.revsconnect.online/reset-password/${resetToken}`;
    const options = mailOption(user.name, user.email, resetPasswordLink);

    // Send the email in the background
    transporter.sendMail(options, (error, info) => {
      if (error) {
        console.error(error);
        // You may want to handle the error differently, e.g., log it and continue
      }
      console.log("Email sent: " + info?.response);
    });

    // Respond to the client without waiting for the email sending process to complete
    res.status(200).send({status:"success",message:"Email sent Successfully."});
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/confirm-forget", async (req, res) => {
  const {  token ,password} = req.body;

  // Check if the email exists in your mock database
  let user = await User.findOne({ resetToken: req.body.token });

  if (!user) {
    return res.status(400).send("User not found. Please check your email address.");
  }

  if(token===user.resetToken){
    const addSalt = await bcrypt.genSalt(5);
    const secPassword = await bcrypt.hash(password, addSalt);
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      user.password = secPassword;
      user.save();
      return res.status(200).send({
        email: user.email,
        name: user.name,
        address: user.address,
        token: token,
        account: user.accountNumber,
        verified: user.verified,
      });
    }
    else{
      res.status(400).send("Password cannot be reset with this link ");
    }

  
});


// router.get('/wldlatestPrice', async (req, res) => {
//   try {

//     const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
//       headers: {
//         'X-CMC_PRO_API_KEY': '26bf5818-08ae-4ef0-8c9e-de268f3d3174',
//         'Accept': '*/*'
//       },
//       params: {
//         id: '13502'
//       }
//     });
//     res.json(response?.data);
//   } catch (error) {
//     console.error('Error fetching data from CoinMarketCap API:', error.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/wld-price', async (req, res) => {
  try {
    const wldPrice = await WldPrice();
    res.status(200).json({status:"Success",price:parseFloat((wldPrice).toFixed(2))});
  } catch (error) {
    console.error("Error retrieving WLD price:", error);
    res.status(500).json({ message: "Error retrieving WLD price" });
  }
});




module.exports = router;
