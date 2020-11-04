const ethers = require('ethers');
const fs = require('fs');

let contractData = JSON.parse(fs.readFileSync('./../build/contracts/ERC20ContinuousToken.json'));
let abi = contractData["abi"];
let bytecode = contractData["bytecode"];
let erc20data = JSON.parse(fs.readFileSync('./../build/contracts/TestERC20.json'));
let erc20abi = erc20data["abi"];
let erc20bytecode = erc20data["bytecode"];

const deployContracts = async (wallet, gasPrice, initialSupplyEth, reserveRatio) => {
    let factory = new ethers.ContractFactory(erc20abi, erc20bytecode, wallet);
    let deployTx = factory.getDeployTransaction('Stablecoin', 'DAI', 18, ethers.utils.parseEther("5000500"));
	deployTx.gasLimit = 4000000;
    deployTx.gasPrice = gasPrice;
    let c1addr;
	try {
		let tx = await wallet.sendTransaction(deployTx);
        let receipt = await wallet.provider.getTransactionReceipt(tx.hash);
        c1addr = receipt.contractAddress;
	} catch(e) {
        console.log('error deploying:', e.message);
        return
    }
    factory = new ethers.ContractFactory(abi, bytecode, wallet);
	deployTx = factory.getDeployTransaction('Action Token', 'ACTION', 18, ethers.utils.parseEther(initialSupplyEth), reserveRatio, c1addr);
	deployTx.gasLimit = 6000000;
    deployTx.gasPrice = gasPrice;
	try {
		let tx = await wallet.sendTransaction(deployTx);
        let receipt = await wallet.provider.getTransactionReceipt(tx.hash);
        return {dct: receipt.contractAddress, dai: c1addr};
	} catch(e) {
		console.log('error deploying:', e.message);
		return
	}
}

const reportStatus = async (actionContract, daiContract, wallet, wallet2, includePrice) => {
    let ethBal = await wallet.getBalance();
    let daiBal = await daiContract.functions.balanceOf(wallet.address);
    let actionBal = await actionContract.functions.balanceOf(wallet.address);
    let ethBal2 = await wallet2.getBalance();
    let daiBal2 = await daiContract.functions.balanceOf(wallet2.address);
    let actionBal2 = await actionContract.functions.balanceOf(wallet2.address);
    let reward1;
    if (includePrice) {
        reward1 = await actionContract.functions.getContinuousMintReward(ethers.utils.parseEther("1"));
    }
    let reserve = await actionContract.functions.reserveBalance();
    let supply = await actionContract.functions.totalSupply();
    console.log("")
    console.log("---Wallet 1---");
    console.log("ETH:", ethers.utils.formatEther(ethBal.toString()));
    console.log("DAI:", ethers.utils.formatEther(daiBal.toString()));
    console.log("ACTION:", ethers.utils.formatEther(actionBal.toString()));
    console.log("---Wallet 2---");
    console.log("ETH:", ethers.utils.formatEther(ethBal2.toString()));
    console.log("DAI:", ethers.utils.formatEther(daiBal2.toString()));
    console.log("ACTION:", ethers.utils.formatEther(actionBal2.toString()));
    console.log("--------------");
    console.log("Total supply ACTION:", ethers.utils.formatEther(supply.toString()));
    console.log("Total reserve DAI:", ethers.utils.formatEther(reserve.toString()));
    if (includePrice) {
        console.log("Price of ACTION:", 1/Number(ethers.utils.formatEther(reward1.toString())));
    }
    console.log("--------------");
    console.log("");
}

const testContracts = async (wallet, wallet2, gasPrice) => {
    console.log("");
    console.log(">>> Wallet 1 deploying DAI and ACTION contracts...");
    let addresses = await deployContracts(wallet, gasPrice, "5000000", 400000);
    let c1 = new ethers.Contract(addresses.dct, abi, wallet);
    let daic = new ethers.Contract(addresses.dai, erc20abi, wallet);
    console.log(">>> Wallet 1 initializing token curve: 5m ACTION for 500 DAI...");
    await daic.functions.transfer(addresses.dct, ethers.utils.parseEther("500").toString(), {gasLimit: 100000, gasPrice: gasPrice});
    await daic.functions.transfer(wallet2.address, ethers.utils.parseEther("5000000").toString(), {gasLimit: 100000, gasPrice: gasPrice});
    await reportStatus(c1, daic, wallet, wallet2, true);
    let c2 = new ethers.Contract(addresses.dct, abi, wallet2);
    let daic2 = new ethers.Contract(addresses.dai, erc20abi, wallet2);
    console.log(">>> Wallet 2 minting ACTION with 5m DAI...");
    let reward500 = await c1.functions.getContinuousMintReward(ethers.utils.parseEther("5000000"));
    await daic2.functions.approve(addresses.dct, ethers.utils.parseEther("5000000").toString(), {gasLimit: 100000, gasPrice: gasPrice});
    let tx = await c2.functions.mint(ethers.utils.parseEther("5000000").toString(), reward500.toString(), {gasLimit: 150000, gasPrice: gasPrice});
    await wallet.provider.getTransactionReceipt(tx.hash);
    await reportStatus(c1, daic, wallet, wallet2, true);
    console.log(">>> Wallet 1 burining 1m ACTION...");
    let mil10 = ethers.utils.parseEther("1000000");
    let refund = await c1.functions.getContinuousBurnRefund(mil10.toString());
    let tx2 = await c1.functions.burn(mil10.toString(), refund.toString(), {gasLimit: 150000, gasPrice: gasPrice});
    await wallet.provider.getTransactionReceipt(tx2.hash);
    await reportStatus(c1, daic, wallet, wallet2, true);
    console.log(">>> Wallet 1 burning 4m ACTION...");
    let bal1 = await c1.functions.balanceOf(wallet.address);
    refund = await c1.functions.getContinuousBurnRefund(bal1.toString());
    let tx1o = await c1.functions.burn(bal1.toString(), refund.toString(), {gasLimit: 150000, gasPrice: gasPrice});
    await wallet2.provider.getTransactionReceipt(tx1o.hash);
    await reportStatus(c1, daic, wallet, wallet2, true);
    console.log(">>> Wallet 2 burning all ACTION...");
    let bal2 = await c1.functions.balanceOf(wallet2.address);
    refund = await c2.functions.getContinuousBurnRefund(bal2.toString());
    let txLast = await c2.functions.burn(bal2.toString(), refund.toString(), {gasLimit: 150000, gasPrice: gasPrice});
    await wallet2.provider.getTransactionReceipt(txLast.hash);
    await reportStatus(c1, daic, wallet, wallet2, false);
}

(async () => {
    let wallet, wallet2;
    while (true) {
        try {
            let providerURL = "http://127.0.0.1:8545";
            let provider = new ethers.providers.JsonRpcProvider(providerURL);
            let priv1 = "0xb9b0b5bae912eabc8b8140d594fa7bf685694e255ac1e915d8c12cde2c7c6247";
            wallet = new ethers.Wallet(priv1, provider);
            let priv2 = "0x977203eb2be2a71a66c9d41cb1895479eb44b5bd8cb9af5f8703a0b6cab861a5";
            wallet2 = new ethers.Wallet(priv2, provider);
            await wallet.getBalance();
            break
        } catch(_e) {
            console.log("waiting for local blockchain...");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    await testContracts(wallet, wallet2, Number(35000000000));
})();