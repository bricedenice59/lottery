import { useEffect, useState } from "react";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

var deployedAddress;
var currentAccount;

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

    function getLotteryDeployedAddress() {
        var chainIdStr = parseInt(chainId).toString();
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
        deployedAddress = getLotteryDeployedAddress();
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
        const ethers = Moralis.web3Library;
        const provider = await new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(deployedAddress, contractAbi, signer);

        contract.removeAllListeners("WinnerPicked");
        contract.once("WinnerPicked", async (from) => {
            await dispatchWinnerPickedNotification();
            await UpdateUI();
        });
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            currentAccount = account;
            UpdateUI();
            SubscribeWinnerPickedEvent();
        }
    }, [isWeb3Enabled]);

    useEffect(() => {
        console.log(`chain changed to ${chainId}`);
        UpdateUI();
    }, [isChainIdSupported(chainId)]);

    useEffect(() => {
        currentAccount = account;
        UpdateUI();
    }, [account]);

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
                    <div></div>
                )
            ) : (
                <div></div>
            )}
        </div>
    );
}
