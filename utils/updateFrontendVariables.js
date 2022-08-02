const fs = require("fs");
var path = require("path");
require("dotenv").config();

const updateContractAddresses = (address) => {
    const chainId = network.config.chainId.toString();
    const addressesFilePath = path.join(
        process.cwd(),
        process.env.CONTRACT_CONSTANTS_FOLDER,
        process.env.CONTRACT_ADDRESSES_FILE
    );
    const fsRead = fs.readFileSync(addressesFilePath, "utf-8");
    const currentAddresses = JSON.parse(fsRead);
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(address)) {
            currentAddresses[chainId].push(address);
        }
    } else currentAddresses[chainId] = [address];

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

module.exports = {
    updateContractAddresses,
    updateContractAbi,
};
