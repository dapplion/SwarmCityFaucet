const Web3 = require('web3');
const web3 = new Web3('wss://kovan.swarm.city');
const express = require('express')
const app = express()
const level = require('level')
const util = require('ethereumjs-util')
const db = level('./db')
const Tx = require('ethereumjs-tx')
const cors = require('cors')

process.argv[2] = ""

app.use(cors({
    origin: 'https://test-b.swarm.city'
  }));

app.listen(3000)

const asyncMiddleware = fn =>
    (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch(next);
    };

async function getBalance(address) {
    let balance = await web3.eth.getBalance(address)
    return balance
}

async function doTransfer(address) {
    var private = Buffer.from(process.argv[2], 'hex')
    var senderBuffer = await util.privateToAddress('0x'+process.argv[2])
    var sender = util.bufferToHex(senderBuffer)
    var value = web3.utils.toHex('200000')
    var gasPrice = await web3.eth.getGasPrice()
    var nonceTo = await web3.eth.getTransactionCount(address)
    var nonceSender = await web3.eth.getTransactionCount(sender)
    var rawTransaction = {
        "nonce": nonceSender++,
        "from": sender,
        "to": address,
        "gasLimit": 314150,
        "gasPrice": 2400000000,
        "value": 50000000000000000,       
        "chainId": 42
    };
    var tx = new Tx(rawTransaction)
    tx.sign(private);
    var raw = '0x' + tx.serialize().toString('hex');
    var status = await web3.eth.sendSignedTransaction(raw)
    console.log('https://kovan.etherscan.io/tx/'+status.transactionHash)
    console.log('\n')
    return ('https://kovan.etherscan.io/tx/'+status.transactionHash)
}

app.get('/:address', asyncMiddleware(async (req, res, next) => {

    let address = req.params.address
    console.log('request: ', address)
    let balance = await getBalance(address)
    console.log(address, ' has ', balance)
    if(balance < 500000000000000000) {
        console.log("request for ", address)
        // check last time address was seen
        if(await db.get(address) && await db.get(address) < (Date.now() - 10000)) {
            console.log("Okay for ", address)
            doTransfer(address)
            .then((result) => {
                db.put(address, Date.now())
                res.send(result)
            })
        } else {
            console.log("Too soon for ", address)
            console.log(await db.get(address), " -- ", Date.now())
            res.send('toosoon')
        }
    } else {
        console.log('balance is high enoug ', address)
        res.send('balance is high enough')
    }
    db.put(address, Date.now())
}));

async function runFaucet() {
    console.log("Swarm City Faucet")
}

runFaucet()