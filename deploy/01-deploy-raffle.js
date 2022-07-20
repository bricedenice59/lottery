require("dotenv").config();
const { network, ethers } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUBSCRIPTION_FUND_AMOUNT = ethers.utils.parseEther("10");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    var vrfCoordinatorV2dAddress, subscriptionId;
    if (chainId == 31337) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2dAddress = vrfCoordinatorV2Mock.address;

        const transactionCreateSubscription = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceiptCreateSubscription = await transactionCreateSubscription.wait(1);
        subscriptionId = transactionReceiptCreateSubscription.events[0].args.subId;

        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUBSCRIPTION_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2dAddress = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    var participationFee = networkConfig[chainId]["participationFee"];
    var gasLane = networkConfig[chainId]["keyHash"];
    var callBackGasLimit = networkConfig[chainId]["callBackGasLimit"];
    var eventTriggerTimestamp = networkConfig[chainId]["eventTriggerTimestamp"];

    const args = [
        vrfCoordinatorV2dAddress,
        participationFee,
        gasLane,
        subscriptionId,
        callBackGasLimit,
        eventTriggerTimestamp,
    ];

    var deploymentResult = await deploy("Raffle", {
        from: deployer,
        gasLimit: 4000000,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    //only verifies on testnets
    if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
        log("Verifing contract on Etherscan!");
        log("----------------------");
        await verify(deploymentResult.address, args);
        log("--------Verify Done--------------");
    }

    log("Raffle contract deployed!");
    log("----------------------");
};

module.exports.tags = ["all", "raffle"];
