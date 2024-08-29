const Web3 = require("web3");
const abi = require("./abi.js");
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

async function WldPrice() {
 
    const assets = [process.env.USDC, process.env.BTC, process.env.WLD];
  
    const contract = new web3.eth.Contract(tokenAbi[2], assets[2]);
  
        const symbol = await contract.methods.symbol().call();
        const decimals = await contract.methods.decimals().call();
        let priceFetched = await oracle.WLDToKES((1 * 10 ** decimals).toString());
            
    
        // console.log("symbol fetched,",symbol);
        
       return priceFetched = +ethers.utils.formatEther(priceFetched.toString());
        
   
}

module.exports = WldPrice;
