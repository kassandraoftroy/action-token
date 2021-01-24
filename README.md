# Action Token

ACTION is a new continuous ERC20 token backed by DAI reserves for permissionless gaming on Ethereum

## Install and Test

1. Clone this repository
2. Install dependencies: `npm install`
3. Run test: `npm run test`

## Minting and Burning Tokens

ACTION is a continuous token issued on a token bonding curve, which means it can be minted or burned by anyone at any time, creating a permissionless liquidity pool.

Minting:

To mint tokens call: 

`function mint(uint _amount, uint _minReceived) public`

`_amount` is the amount of DAI being spent
`_minReceived` is the minimum amount of ACTION to receive in return for the _amount of DAI (reverts if reward is too low, mitigates frontrunning attacks)

To estimate the amount of tokens you'll receive for minting call:

`function getContinuousMintReward(uint _reserveTokenAmount) public view returns (uint)`

Here's a simple example

```
const actionSDK = require('./index.js');
const ethers = require('ethers');

let provider = new ethers.providers.JsonRpcProvider(<a providerURL>);
let wallet = new ethers.Wallet(<hex private key>, provider);

let action = actionSDK.ActionContract.connect(wallet);
let dai = actionSDK.DaiContract.connect(wallet);

let oneDollar = ethers.utils.parseEther("1");
let maxReward = await action.functions.getContinuousMintReward(oneDollar);
let minReward = maxReward - (maxReward*0.01);
let approveTX = await dai.functions.approve(action.address, oneDollar.toString(), {gasLimit: 100000});
let mintTX = await c2.functions.mint(oneDollar.toString(), minReward.toString(), {gasLimit: 150000});
```

Burning:

To burn tokens call: 

`function burn(uint _amount, uint _minReceived) public`

`_amount` is the amount of ACTION being burned
`_minReceived` is the minimum amount of DAI to receive in return for the _amount of ACTION (reverts if refund is too low, mitigates frontrunning attacks)

To estimate the amount of tokens you'll receive for burning, call:

`function getContinuousBurnRefund(uint _continuousTokenAmount) public view returns (uint)`

Here's a simple example

```
const actionSDK = require('./index.js');
const ethers = require('ethers');

let provider = new ethers.providers.JsonRpcProvider(<a providerURL>);
let wallet = new ethers.Wallet(<hex private key>, provider);

let action = actionSDK.ActionContract.connect(wallet);

let oneActionToken = ethers.utils.parseEther("1");
let maxRefund = await action.functions.getContinuousBurnRefund(oneActionToken.toString());
let minRefund = maxRefund - (maxRefund*0.01);
let burnTX = await c1.functions.burn(oneActionToken.toString(), minRefund.toString(), {gasLimit: 150000, gasPrice: gasPrice});
```

# Rinkeby Testnet

If you want to test on the rinkeby tstnet we have simple support for that...

```
// pass optional argument to change network from mainnet
let action = actionSDK.ActionContract.connect(wallet, 'rinkeby');
```

You'll have to acquire some of our rinkeby test DAI... hoping to set up a faucet soon, but for now you can send an ethereum address to actiontoken@protonmail.com to be forwarded some DAI.
