const Express = require("express");
const router = Express.Router();
const User = require("../models/Users");
const admin = require("../middleware/admin.js");
const axios = require("axios");


router.get("/totaluser", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.status(200).json({ status: "Success", userCount: userCount });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some error occurred while counting users");
  }
});

router.get("/totalDatabase", async (req, res) => {
  try {
    // Find all users
    const users = await User.find();

    // Get total count of users
    const totalCount = users.length;

    res.status(200).json({
      totalUsers: totalCount,
      users: users
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some error occurred while fetching users");
  }
});


// Route to get users with pagination
router.get("/totalusersdata", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const pageSize = parseInt(req.query.pageSize);

    // Calculate the number of documents to skip based on the current page
    const skip = (page - 1) * pageSize;

    // Find users, limit results to pageSize, and skip the appropriate number of documents
    const users = await User.find()
      .limit(pageSize)
      .skip(skip);

    // Get total count of users for pagination
    const totalCount = await User.countDocuments();

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize),
      users: users
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some error occurred while fetching users");
  }
});

router.get("/unpaidUsersCount", async (req, res) => {
  try {
    // Define the query to match users with unpaid details
    const query = {
      "details": {
        "$all": [
          {
            "$elemMatch": {
              "paid": false
            }
          }
        ]
      }
    };

    // Count users that match the query
    const unpaidUsersCount = await User.countDocuments(query);

    res.status(200).json({ status: "Success", unpaidUsersCount: unpaidUsersCount });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some error occurred while counting unpaid users");
  }
});

// router.get("/paidUsers", async (req, res) => {
//   try {
//     // Aggregate pipeline to count users with at least one detail where paid is true
//     const pipeline = [
//       {
//         $match: {
//           "details.paid": true
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           paidUsers: { $sum: 1 }
//         }
//       }
//     ];

//     // Execute the aggregation pipeline
//     const result = await User.aggregate(pipeline);

//     // Extract the count from the result
//     const paidUsersCount = result.length > 0 ? result[0].paidUsers : 0;

//     res.status(200).json({ status: "Success", paidUsers: paidUsersCount });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send("Some error occurred while fetching paid users");
//   }
// });
router.get("/paidUsers", async (req, res) => {
  try {
    const paidUsers = await User.find({ "details.paid": true });

    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;

    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        if (detail.paid) {
        
          totalPaymentObjects++;
        }
      });
    });


    res.status(200).json({ status: "Success", totalPaymentObjects });
  } catch (error) {
    console.error("Error occurred while fetching users with paid status:", error);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});

router.get("/balance", async (req, res) => {
  try {
    const walletId = process.env.INTASENDWALLET;
    const Token = process.env.INTASENDTOKEN;

    // Check if wallet ID and authorization token are provided
    if (!walletId || !Token) {
      return res.status(400).json({ message: "Wallet ID or authorization token is missing" });
    }

    // Make request to Intasend API
    const response = await axios.get(`https://payment.intasend.com/api/v1/wallets/${walletId}`, {
      headers: {
        Authorization: `Bearer ${Token}`
      }
    });

    // Return data from Intasend API
    res.status(200).json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get("/spendingAmount", async (req, res) => {
  try {
    // Query users with paid status
    const paidUsers = await User.find({ "details.paid": true });

    // Get current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Add 1 because months are zero-indexed
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();
    console.log("current time", currentMonth, currentDay, currentYear)

    // Initialize variables for total fiat amount and total payment objects
    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;

    // Iterate through paid users and their payment details
    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        const timestamp = new Date(detail.timestamp);
        const paymentMonth = timestamp.getMonth() + 1;
        const paymentYear = timestamp.getFullYear();
        const paymentDay = timestamp.getDate();

        if (paymentYear === currentYear && paymentMonth === currentMonth && paymentDay >= 1) {
          // console.log("user times",paymentDay,paymentMonth,paymentYear)
          // Increment total fiat amount for valid payments
          totalFiatAmount += detail.fiatAmount;
          // Increment total payment objects
          totalPaymentObjects++;
        }
      });
    });

    // Ensure totalFiatAmount has only 2 decimal places
    totalFiatAmount = parseFloat(totalFiatAmount.toFixed(2));
    dollarAmount = parseFloat((totalFiatAmount / process.env.KES_RATE).toFixed(1));

    res.status(200).json({ status: "Success", totalFiatAmount, totalPaymentObjects, dollarAmount });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});



router.get("/WeaklyTransactions", async (req, res) => {
  const days = req.query.days || 7;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * limit;

  try {
    const paidUsers = await User.find({
      "details": { $exists: true, $not: { $size: 0 } },
    });

    // Get current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();

    // Initialize variables for total fiat amount and total payment objects
    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;
    let weeklyTransactions = [];

    let previousMonthDays = currentDay - days;
    let monthCondition = currentMonth - 1;
    if (monthCondition === 0) {
      monthCondition = 12;
    }

    // Iterate through paid users and their payment details
    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        const timestamp = new Date(detail.timestamp);
        const paymentMonth = timestamp.getMonth() + 1;
        const paymentYear = timestamp.getFullYear();
        const paymentDay = timestamp.getDate();

        // Check if the payment is within the last 'days' days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        if (timestamp >= daysAgo && paymentYear === currentYear && paymentMonth === currentMonth) {
          // Increment total fiat amount for valid payments
          totalFiatAmount += detail.fiatAmount;
          // Increment total payment objects
          totalPaymentObjects++;
          // Push the detail object to weeklyTransactions array
          const transactionWithAccount = { ...detail, account: user.accountNumber }; // Add account number to the transaction object
          weeklyTransactions.push(transactionWithAccount);
        }

        if (previousMonthDays < 0 && paymentYear === currentYear && paymentMonth === monthCondition) {
          // Calculate the date 'days' days ago from the last day of the previous month
          const previousMonthDate = new Date(currentYear, currentMonth - 1, 0); // Last day of previous month
          previousMonthDate.setDate(previousMonthDate.getDate() + previousMonthDays);
          if (timestamp >= previousMonthDate && timestamp < new Date(currentYear, currentMonth, 1)) {
            // Increment total fiat amount for valid payments
            totalFiatAmount += detail.fiatAmount;
            // Increment total payment objects
            totalPaymentObjects++;
            // Push the detail object to weeklyTransactions array
            const transactionWithAccount = { ...detail, account: user.accountNumber }; // Add account number to the transaction object
            weeklyTransactions.push(transactionWithAccount);
          }
        }
      });
    });

    // Sort transactions by date (newest to oldest)
    weeklyTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Ensure totalFiatAmount has only 2 decimal places
    totalFiatAmount = parseFloat(totalFiatAmount.toFixed(2));
    dollarAmount = parseFloat((totalFiatAmount / process.env.KES_RATE).toFixed(1));

    // Implement pagination
    const totalPages = Math.ceil(weeklyTransactions.length / limit);
    const currentPageTransactions = weeklyTransactions.slice(skip, skip + limit);

    res.status(200).json({ status: "Success", totalFiatAmount, totalPaymentObjects, dollarAmount, totalPages, currentPage: page, currentPageTransactions });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});

router.get("/TransactionsForExport", async (req, res) => {
  const days = req.query.days || 30;

  try {
    const paidUsers = await User.find({
      "details": { $exists: true, $not: { $size: 0 } },
    });

    // Get current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();

    // Initialize variables for total fiat amount and total payment objects
    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;
    let weeklyTransactions = [];

    let previousMonthDays = currentDay - days;
    let monthCondition = currentMonth - 1;
    if (monthCondition === 0) {
      monthCondition = 12;
    }

    // Iterate through paid users and their payment details
    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        const timestamp = new Date(detail.timestamp);
        const paymentMonth = timestamp.getMonth() + 1;
        const paymentYear = timestamp.getFullYear();
        const paymentDay = timestamp.getDate();

        // Check if the payment is within the last 'days' days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        if (timestamp >= daysAgo && paymentYear === currentYear && paymentMonth === currentMonth) {
          // Increment total fiat amount for valid payments
          totalFiatAmount += detail.fiatAmount;
          // Increment total payment objects
          totalPaymentObjects++;
          // Push the detail object to weeklyTransactions array
          const transactionWithAccount = { ...detail, account: user.accountNumber }; // Add account number to the transaction object
          weeklyTransactions.push(transactionWithAccount);
        }

        if (previousMonthDays < 0 && paymentYear === currentYear && paymentMonth === monthCondition) {
          // Calculate the date 'days' days ago from the last day of the previous month
          const previousMonthDate = new Date(currentYear, currentMonth - 1, 0); // Last day of previous month
          previousMonthDate.setDate(previousMonthDate.getDate() + previousMonthDays);
          if (timestamp >= previousMonthDate && timestamp < new Date(currentYear, currentMonth, 1)) {
            // Increment total fiat amount for valid payments
            totalFiatAmount += detail.fiatAmount;
            // Increment total payment objects
            totalPaymentObjects++;
            // Push the detail object to weeklyTransactions array
            const transactionWithAccount = { ...detail, account: user.accountNumber }; // Add account number to the transaction object
            weeklyTransactions.push(transactionWithAccount);
          }
        }
      });
    });

    // Sort transactions by date (newest to oldest)
    weeklyTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Ensure totalFiatAmount has only 2 decimal places
    totalFiatAmount = parseFloat(totalFiatAmount.toFixed(2));
    dollarAmount = parseFloat((totalFiatAmount / process.env.KES_RATE).toFixed(1));

    res.status(200).json({ status: "Success", totalFiatAmount, totalPaymentObjects, dollarAmount, transactions: weeklyTransactions });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});



router.get("/WeaklyChartData", async (req, res) => {
  const days = req.query.days || 7;

  try {
    const paidUsers = await User.find({
      "details": { $exists: true, $not: { $size: 0 } },
    });

    // Get current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();

    // Initialize variables for total fiat amount and total payment objects
    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;
    let dailyRevenue = [];

    // Iterate through paid users and their payment details
    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        const timestamp = new Date(detail.timestamp);
        const paymentMonth = timestamp.getMonth() + 1;
        const paymentYear = timestamp.getFullYear();
        const paymentDay = timestamp.getDate();
        const revenue = detail.fiatAmount;

        // Check if the payment is within the last 'days' days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        if (timestamp >= daysAgo && timestamp <= currentDate) {
          // Increment total fiat amount for valid payments
          totalFiatAmount += detail.fiatAmount;
          // Increment total payment objects
          totalPaymentObjects++;
          // Aggregate revenue by day
          const dateKey = timestamp.getDate();
          const existingDay = dailyRevenue.find(day => day.date === dateKey);
          if (existingDay) {
            existingDay.revenue += revenue;
          } else {
            dailyRevenue.push({ date: dateKey, revenue });
          }
        }
      });
    });

    // Convert each day's revenue to KES
    dailyRevenue.forEach(day => {
      day.revenue = parseFloat((day.revenue / process.env.KES_RATE).toFixed(2));
    });
    // Sort dailyRevenue array by date in ascending order
    dailyRevenue.sort((a, b) => b.date - a.date);

    // Ensure totalFiatAmount has only 2 decimal places
    totalFiatAmount = parseFloat(totalFiatAmount.toFixed(2));
    dollarAmount = parseFloat((totalFiatAmount / process.env.KES_RATE).toFixed(1));

    res.status(200).json({ status: "Success", totalFiatAmount, totalPaymentObjects, dollarAmount, dailyRevenue });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});


router.get("/MonthlyChartData", async (req, res) => {
  try {
    // Fetch paid users with non-empty details
    const paidUsers = await User.find({ "details": { $exists: true, $not: { $size: 0 } } });

    // Get current date
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Initialize variables for total fiat amount, total payment objects, and monthly revenue
    let totalFiatAmount = 0;
    let totalPaymentObjects = 0;
    let monthlyRevenue = [];

    // Iterate through paid users and their payment details
    paidUsers.forEach(user => {
      user.details.forEach(detail => {
        const timestamp = new Date(detail.timestamp);
        const paymentMonth = timestamp.getMonth() + 1;
        const paymentYear = timestamp.getFullYear();
        const revenue = detail.fiatAmount;

        // Check if the payment is within the last 6 months
        if (paymentYear === currentYear && paymentMonth >= currentMonth - 6 && paymentMonth <= currentMonth) {
          // Increment total fiat amount for valid payments
          totalFiatAmount += detail.fiatAmount;
          // Increment total payment objects
          totalPaymentObjects++;

          // Aggregate revenue by month
          const monthKey = new Date(paymentYear, paymentMonth - 1).toLocaleString('en-us', { month: 'long' });
          const existingMonth = monthlyRevenue.find(month => month.month === monthKey);
          if (existingMonth) {
            existingMonth.revenue += revenue;
          } else {
            monthlyRevenue.push({ month: monthKey, revenue });
          }
        }
      });
    });

    // Convert each month's revenue to KES and ensure it has only 2 decimal places
    monthlyRevenue.forEach(month => {
      month.revenue = parseFloat((month.revenue / process.env.KES_RATE).toFixed(2));
    });

    // Sort monthlyRevenue array by month in descending order
    monthlyRevenue.sort((a, b) => {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
    });

    // Ensure totalFiatAmount has only 2 decimal places and convert it to KES
    totalFiatAmount = parseFloat(totalFiatAmount.toFixed(2));
    dollarAmount = parseFloat((totalFiatAmount / process.env.KES_RATE).toFixed(1));

    // Send success response with total fiat amount, total payment objects, dollar amount, and monthly revenue
    res.status(200).json({ status: "Success", totalFiatAmount, totalPaymentObjects, dollarAmount, monthlyRevenue });
  } catch (error) {
    // Handle errors and send error response
    console.error(error.message);
    res.status(500).json({ message: "Error occurred while fetching users with paid status" });
  }
});
































module.exports = router;
