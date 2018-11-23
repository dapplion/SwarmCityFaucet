const Web3 = require('web3');
const web3 = new Web3('wss://kovan.swarm.city');
const express = require('express')
const app = express()
const level = require('level')
const util = require('ethereumjs-util')
const db = level('./db')
const list = level('./queue')
const Tx = require('ethereumjs-tx')
const cors = require('cors')

//process.argv[2] = ""

const asyncMiddleware = fn =>
    (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch(next);
    };

app.use(cors({
    origin: '*'
  }));

app.listen(33333)

async function iterateQueue () {
    console.log('Going through queue')
    var stream = list
    .createReadStream({
    keys: true,
    values: true
    })
    .on("data", asyncMiddleware(async item => {
        console.log("item:", item);
        var isItemAddress = await isAddress(item.key)
        if(!isItemAddress) {
            console.log(item.key, " is not a valid address.")
            list.del(item.key)
            stream.destroy()
            return
        }
        var isItemKnown = await makeKnown(item.key)
        if(!isItemKnown) {
            console.log(item.key, " something wrong storing or retrieving")
            list.del(item.key)
            stream.destroy()
            return
        }
        var isItemValid = await checkValidity(item.key)
        if(isItemValid) {
            console.log('item can get money now')
            var result = await doTransfer(item.key)
            console.log(result)
            list.del(item.key)
            console.log("Removed item ", item.key, " from list")
            stream.destroy();
        } else {
            console.log('item is not valid')
        } 
    }))
}
        

var q = []

app.get('/:address', asyncMiddleware(async (req, res, next) => {
    console.log('Request: ', req.params.address)
    var address = req.params.address
    list.put(address, Date.now())
    res.status(200).json({ 'status': 'queued'})
}));

async function doTransfer(address) {
    db.put(address, Date.now())
    //return 'transfer'
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
    db.put(address, Date.now())
    return ('https://kovan.etherscan.io/tx/'+status.transactionHash)
}

async function getBalance(address) {
    var balance = await web3.eth.getBalance(address)
    return balance
}

async function isAddress(address) {
    return await web3.utils.isAddress(address)
}

async function makeKnown(address) {
    try {
        await db.get(address);
        return true
      } catch (error) {
        //return response.status(400).send(error);
        var res = await db.put(address, Date.now()-10000)
        return true
      }
}

async function checkValidity(address) {
    console.log('checking validity for ', address)
    var balance = await getBalance(address)
    if(balance > 500000000000000000) throw Error('Balance sufficient')
    if(await db.get(address) < (Date.now() - 10000)) {
        return true
    } else {
        console.log("Too soon for ", address)
        return false
    }
}

async function runFaucet() {
    console.log("Swarm City Faucet")
    // queue monitor
setInterval(() => {
    iterateQueue();
  }, 10 * 1000);
}

runFaucet()