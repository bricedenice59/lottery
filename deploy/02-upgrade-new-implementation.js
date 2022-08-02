const { network, ethers, upgrades } = require("hardhat");
const { contractAddresses } = require("../contracts_constants/index");
const { updateContractAbi } = require("../utils/updateFrontendVariables");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    log("---------Upgrading...------------");

    const proxyAddress = contractAddresses[chainId][0];
    console.log(proxyAddress);
    if (!proxyAddress) {
        throw new Error("A proxy address could not be found, has it been already deployed?");
    }

    const contractName = "RaffleV2";
    var contractInstance;
    try {
        contractInstance = await ethers.getContractFactory(contractName);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }

    await upgrades.upgradeProxy(proxyAddress, contractInstance, {
        from: deployer,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    //overwrite abi json file with latest implementation (V2 in current case)
    if (
        process.env.UPDATE_FRONT_END &&
        process.env.CONTRACT_CONSTANTS_FOLDER &&
        process.env.CONTRACT_ABI_FILE
    ) {
        updateContractAbi(contractInstance);
    }

    log("--------Upgrade done--------------");
};

module.exports.tags = ["upgrade"];
