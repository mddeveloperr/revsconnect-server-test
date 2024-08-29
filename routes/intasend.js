const express = require('express');
const router = express.Router();
const payout = require('../middleware/intasend.js'); // Assuming your middleware is in the middleware folder
const fetchuser = require("../middleware/fetchUser.js");

// Variable to store the timestamp of the last API call
let lastAPICallTimestamp = 0;

router.post('/stoppayingmanuallyforsometime',fetchuser, async (req, res) => {
  try {
    const currentTime = Date.now();
    
    if (currentTime - lastAPICallTimestamp < 1 * 60 * 1000) {
      return res.status(400).json({ error: 'Please try after one Minute' });
    }

    const emails = req.body.emails;
    console.log('Request Data:', req.body); // Log the request data
    const response = await payout(emails);
    // console.log("................",response.status)

    // Update the timestamp of the last API call
    lastAPICallTimestamp = currentTime;

    if(response.status){
      res.status(200).json({ message: response.message, status:response.status });
      
    }else{
      res.status(400).json({ error: response.message, status:response.status });

    }
  } catch (error) {
    console.error(`Payouts endpoint error: ${error}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
