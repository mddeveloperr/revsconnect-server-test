
const mongoose=require("mongoose");
// address to connect with db
const mongooseUri=`mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@revsconnect.qjbbb5n.mongodb.net/revsconnect`;
// const mongooseUri=`mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@cluster0.gba4jn4.mongodb.net/revsconnect`;



const connectToMongoose =async()=>{
  try{
    //request for connection with mongodb
   await  mongoose.connect(mongooseUri);
   console.log("Db connected successfully"); 
   console.log("Now you are Live"); 
  }catch(error){
    // In failure snario
    console.log("Database connection failed.");
    console.log(error);
    process.exit(1);
  } 
}

function checkMongoDBConnectionStatus() {
  const db = mongoose.connection;

  // Check the connection status
  if (db.readyState === 1) {
    return true;
  } 
  else {
    return false;
  }
}



// {
//   "details": {
//     "$all": [
//       {
//         "$elemMatch": {
//           "paid": false
//         }
//       }
//     ]
//   }
// }

module.exports={connectToMongoose,checkMongoDBConnectionStatus};