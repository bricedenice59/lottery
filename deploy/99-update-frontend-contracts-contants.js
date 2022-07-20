const { ethers, network } = require("hardhat");
const fs = require("fs");
var path = require("path");

module.exports = async function () {
    if (
        process.env.UPDATE_FRONT_END &&
        process.env.CONTRACT_CONSTANTS_FOLDER &&
        process.env.CONTRACT_ADDRESSES_FILE &&
        process.env.CONTRACT_ABI_FILE
    ) {
        const raffleContract = await ethers.getContract("Raffle");
        console.log("updating front end contracts constants");
        updateContractAddresses(raffleContract);
        updateContractAbi(raffleContract);
    }
};

const updateContractAddresses = (contract) => {
    const chainId = network.config.chainId.toString();
    const addressesFilePath = path.join(
        process.cwd(),
        process.env.CONTRACT_CONSTANTS_FOLDER,
        process.env.CONTRACT_ADDRESSES_FILE
    );
    const fsRead = fs.readFileSync(addressesFilePath, "utf-8");
    const currentAddresses = JSON.parse(fsRead);
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(contract.address)) {
            currentAddresses[chainId].push(contract.address);
        }
    } else currentAddresses[chainId] = [contract.address];

    fs.writeFileSync(addressesFilePath, JSON.stringify(currentAddresses));
};

const updateContractAbi = (contract) => {
    var abi = contract.interface.format(ethers.utils.FormatTypes.json);
    fs.writeFileSync(
        path.join(
            process.cwd(),
            process.env.CONTRACT_CONSTANTS_FOLDER,
            process.env.CONTRACT_ABI_FILE
        ),
        abi
    );
};

module.exports.tags = ["all", "updateFrontend"];
