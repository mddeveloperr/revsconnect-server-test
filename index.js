require('dotenv').config();
const {connectToMongoose,checkMongoDBConnectionStatus}=require("./db/db.js");
const main = require("./middleware/process.js")
const cron = require("node-cron")
const bodyParser = require("body-parser");

connectToMongoose();

const express = require('express')

const cors = require("cors")
const app = express()
const port = process.env.PORT

app.use(cors()) //
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.use("/api/auth",require("./routes/auth"));
app.use("/api/adminroute",require("./routes/adminRoutes"));
app.use("/api/pay",require("./routes/intasend"));
app.use("/api/stallerx",require("./routes/stallerX"));




app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`)
})

cron.schedule('*/30 * * * * *', () => {
  if (checkMongoDBConnectionStatus()) {
    main();
  }
});

