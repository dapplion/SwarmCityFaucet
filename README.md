# SwarmCityFaucet
Simple faucet to provide kovEth to Swarm Citizens

npm install 
nano config.json
```
config.json {
	"etherscanroot": "http://kovan.etherscan.io/address/",
	"payoutfrequencyinsec": 60,
	"payoutamountinether": 0.1,
	"queuesize": 5,
	"walletpwd": "test",
	"httpport": 3000,
	"web3": {
		"host": "http://<YOUR ETH NODE>:8545"
	}
}
```