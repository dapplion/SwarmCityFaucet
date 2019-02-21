# SwarmCityFaucet

Simple faucet to provide kovEth to Swarm Citizens

## How to run

Run the nodejs app with the private key of the faucer sender as the second argument. The app will check it's balance and print it on the screen, make sure it's high enough.

```
npm install
node server [privatekey]
```

You can pass the ENV `WEB3_PROVIDER` to change to the web3 provider:

```
WEB3_PROVIDER=http://localhost:8545 node server [privatekey]
```

Otherwise it will default to kovan infura.

## How to use

To generate requests funds, the front end has to do a **GET** request to **`'/:address'`**, i.e. host.io/0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B

The API will reply with a JSON body:

```js
{
    txHash: '0x063c3a794d0bd429e770fa5fcaee3eee691e47d7b48be106ed9039bdf4d7c866',
    url: 'https://kovan.etherscan.io/tx/0x063c3a794d0bd429e770fa5fcaee3eee691e47d7b48be106ed9039bdf4d7c866'
}
```
