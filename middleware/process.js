const Web3 = require("web3");
const axios = require("axios");
const User = require("../models/Users.js");
const payout = require("./intasend.js");
const getBlockchainData = require("./script.js");
const abi = require("../blockchain/abis/abi.js");

// Initialize a Web3 instance
const web3 = new Web3(process.env.TESTRPC);

async function main() {
  console.log("------------distributor------------");

  const usdcData = await getBlockchainData(0);
  const btcData = await getBlockchainData(1);
  const wldData = await getBlockchainData(2);

  const opt1 = await processs(
    usdcData?.events,
    usdcData?.symbol,
    usdcData?.decimals,
    usdcData?.priceFetched
  );
  const opt2 = await processs(
    btcData?.events,
    btcData?.symbol,
    btcData?.decimals,
    btcData?.priceFetched
  );
  const opt3 = await processs(
    wldData?.events,
    wldData?.symbol,
    wldData?.decimals,
    wldData?.priceFetched
  );
  const array = opt1.concat(opt2).concat(opt3);
  const emails = [...new Set(array)];
  payout(emails);
}


async function processs(items, symbol, decimals, price) {
  let usermails = [];
  for (let index = 0; index < items?.length; index++) {
    const transfer = items[index];
    const timestamp = new Date(transfer?.timestamp * 1000).toLocaleString();
    const user = await User.findOne({
      address: transfer?.returnValues.from.toLowerCase(),
    });
    if (user) {
      usermails.push(user.email);


      const hash = {
        $addToSet: {
          transactions: transfer?.transactionHash,
        },
      };
      const detail = {
        $addToSet: {
          details: {
            hash: transfer.transactionHash,
            asset: symbol,
            amount: (transfer.returnValues.value / 10 ** decimals).toFixed(4),
            fiatAmount: +(
              (transfer.returnValues.value / (10 ** decimals)) *
              price
            ).toFixed(1),
            paid: false,
            timestamp: timestamp,
          },
        },
      };
      // console.log("The detail of user is ",detail)
      // console.log('user is ',user.email);

      if (
        user.transactions &&
        !user.transactions.includes(transfer.transactionHash)
      ) {
        User.updateOne({ email: user.email }, hash)
          .then((result) => {
            User.updateOne({ email: user.email }, detail)
              .then((result) => {
                console.log("Transaction added");
              })
              .catch((updateErr) => {
                console.error(updateErr);
              });
          })
          .catch((updateErr) => {
            console.error(updateErr);
          });
      }
    }
  }
  return usermails;
}

module.exports = main;

