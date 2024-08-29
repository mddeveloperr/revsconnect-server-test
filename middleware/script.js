const Web3 = require("web3");
const abi = require("../blockchain/abis/abi.js");
const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider(process.env.TESTRPC);
const signer = new ethers.Wallet(process.env.SIGNER, provider);
const oracle = new ethers.Contract(process.env.PRICEORACLE, abi[3], signer);

// Initialize a Web3 instance
const web3 = new Web3(process.env.RPC);

// Contract addresses and ABIs
const tokenAbi = abi; // Replace with the actual ABI of the token contract

// User addresses
const toAddress = process.env.OWNERADDRESS;

// Get the latest block number
async function getLatestBlockNumber() {
  return await web3.eth.getBlockNumber();
}

async function getTokenTransfers(asset, startBlock, endBlock) {
  const assets = [process.env.USDC, process.env.BTC, process.env.WLD];

  const contract = new web3.eth.Contract(tokenAbi[asset], assets[asset]);

  const symbol = await contract.methods.symbol().call();
  const decimals = await contract.methods.decimals().call();

  let priceFetched = symbol === "USDC" ? await oracle.usdcToKES((1 * 10 ** decimals).toString())
      : symbol === "WBTC"
      ? await oracle.BTCToKES((1 * 10 ** 18).toString())
      : await oracle.WLDToKES((1 * 10 ** decimals).toString());

  priceFetched = +ethers.utils.formatEther(priceFetched.toString());
  console.log("After Price fetched,", priceFetched);

  try {
    const events = await contract.getPastEvents("Transfer", {
      filter: { to: toAddress },
      fromBlock: startBlock,
      toBlock: endBlock,
    });

    // Add timestamp to each event
    const eventsWithTimestamp = await Promise.all(
      events.map(async (event) => {
        const block = await web3.eth.getBlock(event.blockNumber);
        const timestamp = block?.timestamp;
        return { ...event, timestamp };
      })
    );
    console.log(decimals);
    return { events: eventsWithTimestamp, symbol, decimals, priceFetched };
  } catch (error) {
    console.error("Error retrieving events:", error.message || error);
    // Additional debugging information
    console.error("Error details:", error);
    console.error("Transaction data:", error.transaction);
  }
}



// Main function to retrieve and display token transfers
async function getBlockchainData(asset) {
  const latestBlockNumber = await getLatestBlockNumber();
  const transfers = await getTokenTransfers(
    asset,
    latestBlockNumber - process.env.BLOCKLIMIT,
    latestBlockNumber
  );
  return transfers;
}

module.exports = getBlockchainData;
