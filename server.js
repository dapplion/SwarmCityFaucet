const express = require('express');
const app = express();
const Web3 = require('web3');
const web3Utils = require('web3-utils');
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

/* eslint-disable no-console */

// Faucet parameters (edit)
const upperThresholdEth = 1;
const valueSentPerTxEth = 0.1;
const gasPriceGwei = 1;
const gasLimit = 21000; // Only ETH transaction
const chainId = 42; // Kovan
const privateKey = process.argv[2] || process.env.PRIVATE_KEY;
const web3Provider = process.env.WEB3_PROVIDER || 'https://kovan.infura.io';

// Api parameters (careful editing)
const port = process.env.port || 3000;

// ===================================
// ====== (do not edit below) ========
// ===================================

// Initialize web3 instance, use HTTP to avoid reconnection errors, speed is not critical
const web3 = new Web3(web3Provider);

// Compute private key and address
if (!privateKey) throw Error('You must provide a private address for the faucet sender. Either as env PRIVATE_KEY=842b0041..., or process argument node index.js 842b0041...');
const senderPrivateKey = '0x' + privateKey.replace('0x', '');
const senderAddress = web3.eth.accounts.privateKeyToAccount(senderPrivateKey).address;

// Parameter unit conversion (do not edit)
const upperThresholdWei = web3Utils.toWei(String(upperThresholdEth), 'ether');
const gasPriceWei = web3Utils.toWei(String(gasPriceGwei), 'gwei');
const valueSentPerTxWei = web3Utils.toWei(String(valueSentPerTxEth), 'ether');
console.log('Faucet params \n', {upperThresholdWei, gasPriceWei, valueSentPerTxWei});

app.get('/', (_, res) => res.send('Swarm City faucet service'));

app.get(
    '/status',
    wrapErrors(async (_, res) => {
      const faucetStatus = await getFaucetStatus();
      res.json(faucetStatus);
    })
);

app.get(
    '/:address',
    wrapErrors(async (req, res) => {
    // Compute parameters
      const address = req.params.address;
      if (!address) throw Error('Address param must be defined');
      console.log(`Faucet request for address ${address} from IP ${req.ip} at ${Date()}`);

      // Enforce conditions
      const balance = await web3.eth.getBalance(address);
      const balanceBn = web3.utils.toBN(balance);
      const upperThresholdWeiBn = web3.utils.toBN(upperThresholdWei);
      if (balanceBn.gt(upperThresholdWeiBn)) {
        const balanceEth = web3Utils.fromWei(balance);
        throw Error(`You must have less than ${upperThresholdEth} ETH to request faucet funds. Requested account: ${address} balance: ${balanceEth} ETH`);
      }

      // Prepare tx
      // Web3 method takes care of the nonce, chainId and gasPrice automatically
      // https://web3js.readthedocs.io/en/1.0/web3-eth-accounts.html#signtransaction
      const tx = await web3.eth.accounts.signTransaction(
          {
            to: address,
            value: valueSentPerTxWei,
            gasLimit: gasLimit,
          },
          senderPrivateKey
      );

      // Broadcast tx
      const rawTx = tx.rawTransaction;
      // Using .sendSignedTransaction as a promise resolves on the receipt when mined.
      // For this application it needs the tx hash ASAP, so the event form is used
      web3.eth.sendSignedTransaction(rawTx).on('transactionHash', (hash) => {
        const etherscanTxLink = `https://kovan.etherscan.io/tx/${hash}`;
        console.log(`Sent ${valueSentPerTxEth} ETH to ${address}: ${etherscanTxLink}`);
        res.json({hash, url: etherscanTxLink});
      });
    })
);

// Start API
app.listen(port);
console.log(`App listening at port ${port}`);

// Make sure the provided address has sufficient balance
verifyFaucet();
async function verifyFaucet() {
  // Check network status
  const nodeNetworkId = await web3.eth.net.getId();
  const isListening = await web3.eth.net.isListening();
  if (nodeNetworkId != chainId) throw Error(`WARNING nodeNetworkId ${nodeNetworkId} != chainId ${chainId}`);
  console.log(`Connected to ${web3Provider}, isListening: ${isListening}, nodeNetworkId: ${nodeNetworkId}`);

  // Check the faucet stats
  const faucetStatus = await getFaucetStatus();
  console.log('faucet status \n', faucetStatus);
}

// Modularize to be used on startup and on the /status/ route
async function getFaucetStatus() {
  const blockNumber = await web3.eth.getBlockNumber();
  const faucetBalance = await web3.eth.getBalance(senderAddress);
  const faucetBalanceBn = web3.utils.toBN(faucetBalance);
  const valueSentPerTxWeiBn = web3.utils.toBN(valueSentPerTxWei);
  return {
    blockNumber,
    faucetBalance: web3Utils.fromWei(faucetBalance),
    faucetAddress: senderAddress,
    // Round downwards, if refillsLeft < 1, the faucet is dead
    refillsLeft: parseInt(faucetBalanceBn.div(valueSentPerTxWeiBn).toString(10)),
  };
}
