require("dotenv").config();
const { network, ethers, upgrades } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const { contractAddresses } = require("../contracts_constants/index");
const { updateContractAddresses, updateContractAbi } = require("../utils/updateFrontendVariables");

const VRF_SUBSCRIPTION_FUND_AMOUNT = ethers.utils.parseEther("10");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    var vrfCoordinatorV2dAddress, subscriptionId;
    const proxyAddress = contractAddresses[chainId];

    if (proxyAddress) {
        console.log(
            `A proxy address: ${proxyAddress} has already been found for chainId ${chainId}`
        );
        console.log(
            "Please review if a proxy needs to be re-deployed, new parameters in constructor?"
        );
        process.exit(0);
    }

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
    var linkTokenAddress = networkConfig[chainId]["linkToken"];

    const args = [
        vrfCoordinatorV2dAddress,
        linkTokenAddress,
        participationFee,
        gasLane,
        subscriptionId,
        callBackGasLimit,
        eventTriggerTimestamp,
    ];

    var contractName = "Raffle";

    log("---------Deploying proxy and contract implementation...------------");

    const contractInstance = await ethers.getContractFactory(contractName);
    const proxy = await upgrades.deployProxy(contractInstance, args, {
        initializer: "initialize",
        from: deployer,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    await proxy.deployed();

    console.log(proxy.address, " raffle(proxy) address");
    console.log(implementation, " raffle(implementation) address");
    log("--------Deployment Done--------------");

    log("Updating frontend variable....");

    if (
        process.env.UPDATE_FRONT_END &&
        process.env.CONTRACT_CONSTANTS_FOLDER &&
        process.env.CONTRACT_ADDRESSES_FILE &&
        process.env.CONTRACT_ABI_FILE
    ) {
        updateContractAddresses(proxy.address);
        updateContractAbi(contractInstance);
    }

    log("Frontend variables updated!");

    //only verifies on testnets

    if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
        log("Verifing contract on Etherscan!");
        log("----------------------");
        await verify(implementation, []);
        log("--------Verify Done--------------");
    }

    log("Raffle contract and proxy deployed!");
    log("----------------------");
};

module.exports.tags = ["proxy"];
