import { useEffect, useState } from "react";
import { useWeb3Contract, useMoralis, useMoralisWeb3Api } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

var deployedAddress;
var currentAccount;
var currentChain;

export default function Participate() {
    const { Moralis, chainId, isWeb3Enabled, account } = useMoralis();
    const { runContractFunction } = useWeb3Contract();
    const Web3Api = useMoralisWeb3Api();
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
                handleNotificationTransactionCompleted(txResult);
                await fetchNumberOfParticipants();
                await fetchHasAlreadyParticipated(currentAccount);
            }
        } catch (error) {}
    };

    const handleNotificationTransactionCompleted = (tx) => {
        dispatch({
            type: "info",
            message: tx.transactionHash,
            title: "Transaction completed!",
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
            onError: (error) => console.log(error),
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

    const fetchWinner = async () => {
        const optionsWinner = {
            abi: contractAbi,
            contractAddress: deployedAddress,
            functionName: "getWinner",
            params: {},
        };

        const winnerAddress = await runContractFunction({
            params: optionsWinner,
            onError: (error) => console.log(error),
        });
        return winnerAddress;
    };

    async function UpdateUI() {
        //if (isWeb3Enabled) await Moralis.enableWeb3();

        deployedAddress = getLotteryDeployedAddress(currentChain);
        if (deployedAddress != null) {
            await fetchParticipationFee();
            await fetchNumberOfParticipants();
            await fetchHasAlreadyParticipated(currentAccount);
        }
    }

    async function handleAccountChanged(newAccount) {
        currentAccount = newAccount;
        await UpdateUI();
    }

    async function handleChainChanged(newChain) {
        currentChain = newChain;
        await UpdateUI();
        await SubscribeWinnerPickedEvent();
    }

    async function handleDisconnect() {
        deployedAddress = null;
    }

    async function dispatchWinnerPickedNotification() {
        try {
            //get winnner first
            const winner = await fetchWinner();
            dispatch({
                type: "info",
                message: winner,
                title: "Winner found!",
                position: "topR",
                icon: "bell",
            });
        } catch (error) {}
    }

    async function SubscribeWinnerPickedEvent() {
        if (deployedAddress == null) return;

        const web3Provider = await Moralis.enableWeb3();
        const ethers = Moralis.web3Library;
        const contract = new ethers.Contract(deployedAddress, contractAbi, web3Provider);

        contract.on("WinnerPicked", async (from) => {
            await dispatchWinnerPickedNotification();
            await UpdateUI();
        });
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            currentAccount = account;
            currentChain = chainId;
            UpdateUI();
            SubscribeWinnerPickedEvent();
        }
    }, [isWeb3Enabled]);

    useEffect(() => {
        Moralis.onAccountChanged(handleAccountChanged);
        Moralis.onChainChanged(handleChainChanged);
        Moralis.onWeb3Deactivated(handleDisconnect);
        //subscription cleanup
        return () => {
            Moralis.removeListener("onAccountChanged", handleAccountChanged);
            Moralis.removeListener("onChainChanged", handleChainChanged);
            Moralis.removeListener("onWeb3Deactivated", handleDisconnect);
        };
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
