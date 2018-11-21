const Web3 = require('web3');
const web3 = new Web3('wss://kovan.swarm.city');
const express = require('express')
const app = express()
const level = require('level')
const util = require('ethereumjs-util')
const db = level('./db')
const Tx = require('ethereumjs-tx')
const cors = require('cors')

//process.argv[2] = ""
const asyncMiddleware = fn =>
    (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch(next);
    };

app.use(cors({
    origin: 'https://test-b.swarm.city'
  }));

app.listen(33333)

app.get('/:address', asyncMiddleware(async (req, res, next) => {
    if(isAddress(req.params.address)) {

    } else {
        return 'not a valid address'
    }
    var address = req.params.address
    console.log('request: ', address)
    var balance = await getBalance(address)
    console.log(address, ' has ', balance)
    
    db.get(address, function (err, value) {
        if (err) {
            db.put(address, Date.now() - 10000)
            var result = checkAddress(address).then((result) => {
                res.send(result)
            });

        } else {
            var result = checkAddress(address).then((result) => {
                res.send(result)
            });
        }
    })

}));

async function checkAddress(address) {
    var balance = await getBalance(address)
    if(balance < 500000000000000000) {
        console.log("request for ", address)
        // check last time address was seen
        if(await db.get(address) && await db.get(address) < (Date.now() - 10000)) {
            console.log("Okay for ", address)
            doTransfer(address)
            .then((result) => {
                db.put(address, Date.now())
                return result
            })
        } else {
            console.log("Too soon for ", address)
            console.log(await db.get(address), " -- ", Date.now())
            return 'toosoon'
        }
    } else {
        console.log('balance is high enoug ', address)
        return 'balance is high enough'
    }
    db.put(address, Date.now())
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

async function getBalance(address) {
    var balance = await web3.eth.getBalance(address)
    return balance
}

function isAddress(address) {
    return web3.utils.isAddress(address)
    //return /^(0x)?[0-9a-f]{40}$/i.test(address);
}

async function runFaucet() {
    console.log("Swarm City Faucet")
}

runFaucet()