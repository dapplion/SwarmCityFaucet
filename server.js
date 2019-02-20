const express = require('express');
const app = express();
const Tx = require('ethereumjs-tx');
const Web3 = require('web3');
const web3Utils = require('web3-utils');
const rateLimit = require('express-rate-limit');
// Utils
const wrapErrors = require('./utils/wrapErrors');

/**
 * The SwarmCity faucet will send test ETH to users that who it.
 * The request must be:
 * 'GET' to 'https://path.to.faucet/' + address
 *
 * The conditions to execute the refill are:
 * - userBalance > upperThresholdEth
 */

// Faucet parameters (edit)
const upperThresholdEth = 1;
const valueSentPerTxEth = 5;
const gasPriceGwei = 1;
const gasLimit = 314150;
const chainId = 42; // Kovan
const senderPrivateKey = process.argv[2] || process.env.PRIVATE_KEY;
const web3Provider = process.env.WEB3_PROVIDER || 'https://kovan.infura.io';

// Api parameters (careful editing)
const port = process.env.port || 3000;

// ===================================
// ====== (do not edit below) ========
// ===================================

// Initialize web3 instance, use HTTP to avoid reconnection errors, speed is not critical
const web3 = new Web3(web3Provider);

// Compute private key and address
if (!senderPrivateKey) throw Error('The second argument must be a private address: node index.js 842b0041...');
const senderPrivateKeyBuffer = Buffer.from(senderPrivateKey, 'hex');
const senderAddress = web3.eth.accounts.privateKeyToAccount('0x' + senderPrivateKey).address;

// Parameter unit conversion (do not edit)
const upperThresholdWei = web3Utils.toWei(String(upperThresholdEth), 'ether');
const gasPriceWei = web3Utils.toWei(String(gasPriceGwei), 'gwei');
const valueSentPerTxWei = web3Utils.toWei(String(valueSentPerTxEth), 'ether');

/* eslint-disable no-console */

// only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// app.enable('trust proxy');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// apply to all requests
app.use(limiter);

app.get(
    '/:address',
    wrapErrors(async (req, res) => {
    // Compute parameters
      const address = req.params.address;
      if (!address) throw Error('Address param must be defined');
      console.log(`Faucet request for address ${address} from IP ${req.ip} at ${Date()}`);

      // Enforce conditions
      const balance = await web3.eth.getBalance(address);
      if (balance > upperThresholdWei) {
        throw Error(`You must have less than ${upperThresholdEth} ETH to request faucet funds`);
      }

      // Prepare tx
      const nonceSender = await web3.eth.getTransactionCount(senderAddress);
      const rawTransaction = {
        nonce: nonceSender + 1,
        from: senderAddress,
        to: address,
        gasLimit: gasLimit,
        gasPrice: gasPriceWei,
        value: valueSentPerTxWei,
        chainId,
      };
      const tx = new Tx(rawTransaction);
      tx.sign(senderPrivateKeyBuffer);
      const raw = '0x' + tx.serialize().toString('hex');

      // Broadcast tx
      const status = await web3.eth.sendSignedTransaction(raw);
      const txHash = status.transactionHash;

      // Return link
      const etherscanTxLink = `https://kovan.etherscan.io/tx/${txHash}`;
      console.log(`Sent ${valueSentPerTxEth} ETH to ${address}: $${etherscanTxLink}`);
      res.json({txHash, url: etherscanTxLink});
    })
);

// Start API
app.listen(port);
console.log(`Swarm City Faucet started. Listening at port ${port}`);

// Make sure the provided address has sufficient balance
verifyFaucet();
async function verifyFaucet() {
  const nodeNetworkId = await web3.eth.net.getId();
  const isListening = await web3.eth.net.isListening();
  if (nodeNetworkId != chainId) throw Error(`WARNING nodeNetworkId ${nodeNetworkId} != chainId ${chainId}`);
  console.log(`Connected to ${web3Provider}, isListening: ${isListening}, nodeNetworkId: ${nodeNetworkId}`);
  const senderBalance = await web3.eth.getBalance(senderAddress);
  if (isNaN(senderBalance)) console.log(`Faucet sender = ${senderAddress}, error getting its balance`);
  else console.log(`Faucet sender = ${senderAddress}, remaining balance = ${web3.utils.fromWei(senderBalance, 'ether')} ETH`);
}
