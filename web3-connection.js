const Web3 = require('web3');


// const url = 'wss://kovan.infura.io/ws   '
const KOVAN_WSS = 'wss://kovan.swarm.city'; // Swarm City Chain
// const url = "ws://178.128.207.83:8546"; // Swarm City Chain
// const url = 'ws://my.kovan.dnp.dappnode.eth:8546'

/* eslint-disable no-console */

// Set the web3 instance with a new provider
const web3 = new Web3(getProvider());

// Get the web3 provider object with all event listeners configured
function getProvider() {
  const _provider = new Web3.providers.WebsocketProvider(KOVAN_WSS);
  _provider.on('connect', (e = {}) => {
    console.log(`Web3 provider connected to url: ${(e.target || {})._url}`);
  });
  _provider.on('error', (e = {}) => {
    console.log(`Web3 provider connection error: ${e.message || e}`);
  });
  _provider.on('end', (e = {}) => {
    console.log(`Web3 provider connection ended: ${e.message || e}`);
    console.log('Attempting to reconnect...');
    // On connection error, reset the provider
    web3.setProvider(getProvider());
  });
  return _provider;
}

// Run a getBlockNumber all the time to test the connection
setInterval(() => {
  web3.eth.getBlockNumber().then((blockNumber) => {
    console.log(`Web3 connection is alive, blockNumber: ${blockNumber}`);
  }).catch((e) => {
    console.log(`Error getting blockNumber, web3 connection may be broken: ${e.stack}`);
  });
}, 30 * 1000);

module.exports = web3;
