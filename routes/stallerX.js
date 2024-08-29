const express = require('express');
const router = express.Router();
const StellarSdk = require('stellar-sdk');
// const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const sourceKeys = StellarSdk.Keypair.fromSecret('SCSIZFP2S4QYAKJKLA7W7DGBHFIQFZWZQWX7FENDCBGG3DSJ74BRQPAU');
const axios = require('axios');

// "publicKey":"GCECYXDZGF2S2E2KZJ7UQXEZYKT3YVUCQXHCMMAGCKT7NU4OOIVCMEJ6"


router.get('/generate-keypair', (req, res) => {
    // Generate a new keypair
    const newKeypair = StellarSdk.Keypair.random();

    // Get the public and secret key
    const publicKey = newKeypair.publicKey();
    const secretKey = newKeypair.secret();

    // Respond with the keypair
    res.json({
        publicKey: publicKey,
        secretKey: secretKey,
    });
});

router.post('/fund-account', async (req, res) => {
    const { publicKey } = req.body;

    if (!publicKey) {
        return res.status(400).json({ message: 'Public key is required' });
    }

    try {
        // Fund the existing account using Friendbot (only works on the testnet)
        const friendbotUrl = `https://friendbot.stellar.org?addr=${publicKey}`;
        const response = await axios.get(friendbotUrl);

        // Respond with the funding information
        res.json({
            publicKey: publicKey,
            friendbotResponse: response.data,
            message: 'Account funded successfully!'
        });
    } catch (error) {
        // Capture and log the exact error from the API response
        if (error.response) {
            // Server responded with a status other than 2xx
            console.error('Error funding account:', error.response.data);
            res.status(error.response.status).json({
                message: 'Failed to fund the account',
                error: error.response.data
            });
        } else if (error.request) {
            // Request was made but no response was received
            console.error('Error funding account:', error.request);
            res.status(500).json({
                message: 'Failed to fund the account',
                error: 'No response received from Friendbot'
            });
        } else {
            // Something happened in setting up the request
            console.error('Error funding account:', error.message);
            res.status(500).json({
                message: 'Failed to fund the account',
                error: error.message
            });
        }
    }
});


router.get('/balance', async (req, res) => {
    const publicKey = req.query.publicKey; // Use query parameters
    if (!publicKey) {
        return res.status(400).json({ error: 'Public key is required' });
    }
    try {
        const account = await server.loadAccount(publicKey);
        if (!account || !account.balances) {
            return res.status(404).json({ error: 'Account or balances not found' });
        }
        const balances = account.balances.map((balance) => ({
            type: balance.asset_type,
            balance: balance.balance
        }));
        res.json({ publicKey, balances });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Account not found' });
        }
        console.error('Error fetching balance:', error);
        res.status(500).json({ error: 'Error fetching balance: ' + error.message });
    }
});


router.post('/buy-usdglo', async (req, res) => {
    const { amountXLM, destinationPublicKey, fromAsset, toAsset } = req.body;

    if (!amountXLM || !destinationPublicKey || !fromAsset || !toAsset) {
        return res.status(400).json({ message: 'Amount, destination public key, from asset, and to asset are required' });
    }

    try {
        const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
            .addOperation(StellarSdk.Operation.payment({
                destination: destinationPublicKey, // Destination public key
                asset: new StellarSdk.Asset(fromAsset, sourceKeys.publicKey()), // Replace with the actual asset type
                amount: amountXLM.toString(),
            }))
            .setTimeout(30)
            .build();

        // Sign the transaction
        transaction.sign(sourceKeys);

        // Submit the transaction
        const response = await server.submitTransaction(transaction);
        res.status(200).json({
            success: true,
            message: 'Transaction successful!',
            response: response
        });
    } catch (error) {
        // Capture and log the exact error from the API response
        if (error.response) {
            console.error('Error buying USDGLO:', error.response.data);
            res.status(error.response.status).json({
                message: 'Failed to buy USDGLO',
                error: error.response.data
            });
        } else if (error.request) {
            console.error('Error buying USDGLO:', error.request);
            res.status(500).json({
                message: 'Failed to buy USDGLO',
                error: 'No response received from the network'
            });
        } else {
            console.error('Error buying USDGLO:', error.message);
            res.status(500).json({
                message: 'Failed to buy USDGLO',
                error: error.message
            });
        }
    }
});

router.get('/asset-details', async (req, res) => {
    const { assetCode, issuerPublicKey } = req.query;

    if (!assetCode || !issuerPublicKey) {
        return res.status(400).json({ message: 'Asset code and issuer public key are required' });
    }

    try {
        const response = await server.assets().forCode(assetCode).forIssuer(issuerPublicKey).call();

        if (response.records.length === 0) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.status(200).json(response);
    } catch (error) {
        // Capture and log the exact error from the API response
        if (error.response) {
            console.error('Error fetching asset details:', error.response.data);
            res.status(error.response.status).json({
                message: 'Failed to fetch asset details',
                error: error.response.data
            });
        } else if (error.request) {
            console.error('Error fetching asset details:', error.request);
            res.status(500).json({
                message: 'Failed to fetch asset details',
                error: 'No response received from the network'
            });
        } else {
            console.error('Error fetching asset details:', error.message);
            res.status(500).json({
                message: 'Failed to fetch asset details',
                error: error.message
            });
        }
    }
});


router.post('/create-asset', async (req, res) => {
    const { issuerSecretKey, assetCode } = req.body;

    if (!issuerSecretKey || !assetCode) {
        return res.status(400).json({ message: 'Issuer secret key and asset code are required' });
    }
    try {
        const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
        const issuerPublicKey = issuerKeypair.publicKey();
        const account = await server.loadAccount(issuerPublicKey);
        const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);
        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(StellarSdk.Operation.changeTrust({
            asset: asset,
        }))
        .setTimeout(30)
        .build();
        transaction.sign(issuerKeypair);
        const result = await server.submitTransaction(transaction);

        res.status(200).json({
            message: 'Asset issued successfully',
            result: result,
        });
    } catch (error) {
        console.error('Error issuing asset:', error);
        res.status(500).json({
            message: 'Failed to issue asset',
            error: error.message,
        });
    }
});


module.exports = router;
