const { network } = require("hardhat");
const { BASE_FEE, GAS_PRICE_LINK } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network! Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            gasLimit: 4000000,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
        });
        log("Mocks deployed!");
        log("----------------------");
    }
};

module.exports.tags = ["mocks"];
