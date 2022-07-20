const config = require("dotenv").config();
const dotenvExpand = require("dotenv-expand");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");

dotenvExpand.expand(config);

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PLAYER1_PRIVATE_KEY = process.env.USER1_PRIVATE_KEY;
const PLAYER2_PRIVATE_KEY = process.env.USER2_PRIVATE_KEY;
const PLAYER3_PRIVATE_KEY = process.env.USER3_PRIVATE_KEY;

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL;
const REPORT_GAS = process.env.REPORT_GAS;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.15",
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: [PRIVATE_KEY, PLAYER1_PRIVATE_KEY, PLAYER2_PRIVATE_KEY, PLAYER3_PRIVATE_KEY],
            chainId: 4,
            blockConfirmations: 6,
        },
    },
    gasReporter: {
        enabled: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player1: {
            default: 1,
        },
        player2: {
            default: 2,
        },
        player3: {
            default: 3,
        },
    },
    mocha: {
        timeout: 600000,
    },
};
