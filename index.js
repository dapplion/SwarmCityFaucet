
const express = require('express');
const app = express();
const Tx = require('ethereumjs-tx');
const cors = require('cors');
const web3 = require('./web3-connection');
const web3Utils = require('web3-utils');
const rateLimit = require('express-rate-limit');

/**
 * The SwarmCity faucet will send test eth to users that need it.
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
const senderPrivateKey = process.argv[2];

// Api parameters (careful editing)
const port = 33333;

// =============== (do not edit below)
const senderPrivateKeyBuffer = Buffer.from(senderPrivateKey, 'hex');
const senderAddress = web3.eth.accounts.privateKeyToAccount('0x'+senderPrivateKey).address;

// Parameter unit conversion (do not edit)
const upperThresholdWei = web3Utils.toWei(upperThresholdEth, 'ether');
const gasPriceWei = web3Utils.toWei(gasPriceGwei, 'gwei');
const valueSentPerTxWei = web3Utils.toWei(valueSentPerTxEth, 'ether');

/* eslint-disable no-console */

// only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// app.enable('trust proxy');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 100 requests per windowMs
});

// apply to all requests
app.use(limiter);

// Restrict cors
app.use(cors({origin: '*'}));

app.get('/:address', async (req, res) => {
  try {
    const address = req.params.address;
    console.log(`Faucet request for address ${address} from IP ${req.ip} at ${Date()}`);
    const balance = await web3.eth.getBalance(address);
    if (balance > upperThresholdWei) {
      throw Error(`You must have less than ${upperThresholdEth} ETH to request faucet funds`);
    }
    const txHash = await doTransfer(address);
    const etherscanTxLink = `https://kovan.etherscan.io/tx/${txHash}`;
    console.log(`Sent ${valueSentPerTxEth} ETH to ${address}: $${etherscanTxLink}`);
    res.status(200).json({'status': 'queued'});
  } catch (e) {
    res.status(500).json({'status': 'queued'});
  }
});

async function doTransfer(address) {
  let nonceSender = await web3.eth.getTransactionCount(senderAddress);
  const rawTransaction = {
    'nonce': nonceSender++,
    'from': senderAddress,
    'to': address,
    'gasLimit': gasLimit,
    'gasPrice': gasPriceWei,
    'value': valueSentPerTxWei,
    'chainId': 42,
  };
  const tx = new Tx(rawTransaction);
  tx.sign(senderPrivateKeyBuffer);
  const raw = '0x' + tx.serialize().toString('hex');
  const status = await web3.eth.sendSignedTransaction(raw);
  return status.transactionHash;
}

app.listen(port);

console.log(`Swarm City Faucet started. Listening at port ${port}`);
web3.eth.getBalance(senderAddress).then((senderBalance) => {
  console.log(`Faucet sender = ${senderAddress}, remaining balance = ${web3.utils.fromWei(senderBalance, 'ether')} ETH`);
});
