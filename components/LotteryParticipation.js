import { useEffect, useState } from "react";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

var deployedAddress;
var currentAccount;
var currentChain;
export default function Participate() {
    const { Moralis, chainId, isWeb3Enabled, account } = useMoralis();
    const { runContractFunction } = useWeb3Contract();
    const [participationFee, setParticipationFee] = useState("0");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0");
    const [hasPlayerAlreadyParticipated, setHasPlayerAlreadyParticipated] = useState(false);

    const dispatch = useNotification();

    function isChainIdSupported(chainIdParam) {
        return chainIdParam in contractAddresses;
    }

    function getLotteryDeployedAddress(chainIdParam) {
        var chainIdStr = parseInt(chainIdParam).toString();
        if (isChainIdSupported(chainIdStr)) {
            return contractAddresses[chainIdStr][0];
        }
        return null;
    }

    const participateToLottery = async () => {
        const optionsParticipate = {
            abi: contractAbi,
            contractAddress: deployedAddress,
            functionName: "participate",
            params: {},
            msgValue: participationFee,
        };

        await runContractFunction({
            params: optionsParticipate,
            onSuccess: (tx) => handleSuccessTxParticipate(tx),
            onError: (error) => console.log(error),
        });
    };

    const handleSuccessTxParticipate = async (tx) => {
        try {
            var txResult = await tx.wait(1);
            if (txResult.status == 1) {
                handleNotification(tx);
                await fetchNumberOfParticipants();
                await fetchHasAlreadyParticipated(currentAccount);
            }
        } catch (error) {}
    };

    const handleNotification = (tx) => {
        dispatch({
            type: "info",
            message: "Transaction completed!",
            title: "Tx Notification",
            position: "topR",
            icon: "bell",
        });
    };

    const fetchParticipationFee = async () => {
        const optionsGetParticipationFee = {
            abi: contractAbi,
            contractAddress: deployedAddress,
            functionName: "getParticipationFee",
            params: {},
        };

        const lotteryParticipationFee = await runContractFunction({
            params: optionsGetParticipationFee,
        });

        setParticipationFee(lotteryParticipationFee);
    };

    const fetchNumberOfParticipants = async () => {
        const optionsGetNumberOfParticipants = {
            abi: contractAbi,
            contractAddress: deployedAddress,
            functionName: "getNumberOfPlayers",
            params: {},
        };

        const numberOfPlayers = await runContractFunction({
            params: optionsGetNumberOfParticipants,
            onError: (error) => console.log(error),
        });

        setNumberOfPlayers(numberOfPlayers.toString());
    };

    const fetchHasAlreadyParticipated = async (_address) => {
        const optionsHasAlreadyParticipated = {
            abi: contractAbi,
            contractAddress: deployedAddress,
            functionName: "hasAlreadyParticipated",
            params: { _address },
        };

        const hasAlreadyParticipated = await runContractFunction({
            params: optionsHasAlreadyParticipated,
            onError: (error) => console.log(error),
        });

        setHasPlayerAlreadyParticipated(hasAlreadyParticipated);
    };

    async function UpdateUI() {
        deployedAddress = getLotteryDeployedAddress(currentChain);
        if (deployedAddress != null) {
            await fetchParticipationFee();
            await fetchNumberOfParticipants();
            await fetchHasAlreadyParticipated(currentAccount);
        }
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            currentAccount = account;
            currentChain = chainId;
            UpdateUI();
        }
    }, [isWeb3Enabled]);

    useEffect(() => {
        Moralis.onAccountChanged(async function (newAccount) {
            currentAccount = newAccount;
            await UpdateUI();
        });
        Moralis.onChainChanged(async function (newChain) {
            currentChain = newChain;
            await UpdateUI();
        });
    }, []);

    return (
        <div>
            {isWeb3Enabled ? (
                deployedAddress != null ? (
                    <div>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full disabled:opacity-50 disabled:hover:bg-blue-500"
                            onClick={async function () {
                                await participateToLottery();
                            }}
                            disabled={hasPlayerAlreadyParticipated}
                        >
                            {!hasPlayerAlreadyParticipated
                                ? "Participate"
                                : "Wait for the next round..."}
                        </button>
                        Participation fee :
                        {ethers.utils.formatUnits(participationFee.toString(), "ether")} ETH
                        <div>{numberOfPlayers} player(s) are participating</div>
                    </div>
                ) : (
                    <div>
                        No address found for deployed raffle contract with chainId:{" "}
                        {parseInt(currentChain).toString()}
                    </div>
                )
            ) : (
                <div></div>
            )}
        </div>
    );
}
