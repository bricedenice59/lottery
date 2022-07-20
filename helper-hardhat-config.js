const { ethers } = require("hardhat");

const networkConfig = {
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        participationFee: ethers.utils.parseEther("0.01"),
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "8621",
        callBackGasLimit: "400000",
        eventTriggerTimestamp: "30", //seconds
    },
    31337: {
        name: "hardhat",
        participationFee: ethers.utils.parseEther("0.5"),
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callBackGasLimit: "400000",
        eventTriggerTimestamp: "30", //seconds
    },
};

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;

module.exports = {
    networkConfig,
    BASE_FEE,
    GAS_PRICE_LINK,
};
