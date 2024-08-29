const IntaSend = require("intasend-node");
const User = require("../models/Users");
let intasend = new IntaSend(
  process.env.INTASENDKEY,
  process.env.INTASENDTOKEN,
  false 
);
let payouts = intasend.payouts();

async function payout(emails) {
  try {
    for (const element of emails) {
      const { name, accountNumber } = await User.findOne({ email: element });
      let status = false;
      let amount = 0;
      if (accountNumber) {
        const email = element;

        // Find the document with the specified email
        const document = await User.findOne({ email: email });
        if (!document) {
          console.log("No matching document found.");
          continue;
        }

        amount = 0;

        document.details.forEach((element) => {
          if (!element.paid) {
            amount += (+element.fiatAmount);
          }
        });

        
        if (amount > 0) {
          console.log(`${email} = ${accountNumber} =`,amount.toFixed(2)," KES")
          const name = "RevsConnect";

          const transactions = [
            {
              name: name,
              account: accountNumber,
              amount: amount.toFixed(2),
              narrative: "RevsConnect",
            },
          ];
          // Perform the payouts operation
          try {
            const resp = await payouts.mpesa({
              currency: "KES",
              transactions: transactions,
            });
            console.log(`Payouts response: ${resp}`);
            try {
              const approveResp = await payouts.approve(resp, false);
              console.log(`Payouts approve: ${approveResp}`);
              status = true;
              // Update the 'paid' field for the details that were processed
              document.details.forEach((value, index) => {
                if (!value.paid) {
                  document.details[index].paid = true;
                }
              });

              // Update the document in the database
              try {
                const result = await User.updateOne(
                  { email: email },
                  { $set: { details: document.details } }
                );
                console.log("Transaction updated successfully.");            
                 console.log("Payout status", status);
                
              } catch (updateErr) {
                console.error(updateErr);
                status = false;
              }
            } catch (err) {
              console.error(`Payouts approve error: ${err}`);
              status = false;
            }
          } catch (err) {
            console.error(`Payouts error: ${err}`);
            status = false;
            console.log("Pay status", status);
          }
        }
      }
      if (status) {
        return { status: true, message: "Payout successful" };
      } else {
        return { status: false, message: "Please wait or Try someTime later we are reacharging Intasend Account " };
      }
    }
  } catch (error) {
    console.error(error);
    return { status: false, message: "An error occurred" };
  }
}

module.exports = payout;
