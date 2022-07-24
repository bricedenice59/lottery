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
    const [isFetchingHasAlreadyPlayed, setIsFetchingHasAlreadyPlayed] = useState(false);
    const [waitForParticipatation, setWaitForParticipatation] = useState(false);

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
        setWaitForParticipatation(true);
        await runContractFunction({
            params: optionsParticipate,
            onSuccess: (tx) => handleSuccessTxParticipate(tx),
            onError: (error) => {
                console.log(error);
                setWaitForParticipatation(false);
            },
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
        setWaitForParticipatation(false);
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

        setIsFetchingHasAlreadyPlayed(true);
        const hasAlreadyParticipated = await runContractFunction({
            params: optionsHasAlreadyParticipated,
            onError: (error) => console.log(error),
        });
        setIsFetchingHasAlreadyPlayed(false);
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
        setIsFetchingHasAlreadyPlayed(true);
        setHasPlayerAlreadyParticipated(false);

        deployedAddress = getLotteryDeployedAddress();
        if (deployedAddress != null) {
            await fetchParticipationFee();
            await fetchNumberOfParticipants();
            await fetchHasAlreadyParticipated(currentAccount);
        }
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

    async function OnWinnerPicked() {
        console.log("OnWinnerPicked event triggered... next, notifying...");
        await dispatchWinnerPickedNotification();
        await UpdateUI();
    }

    function SetButtonTextState() {
        if (waitForParticipatation) {
            return "Waiting for confirmation...";
        } else if (!hasPlayerAlreadyParticipated) {
            return "Participate";
        } else return "See you at the next round...";
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            var contract;

            async function DoUpdate() {
                currentAccount = account;
                UpdateUI();
                const ethers = Moralis.web3Library;
                const provider = await new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                contract = new ethers.Contract(deployedAddress, contractAbi, signer);
                contract.on("WinnerPicked", OnWinnerPicked);
            }

            DoUpdate();

            return () => {
                if (contract) {
                    // console.log("cleaning call");
                    // console.log(`before ${contract.listenerCount("WinnerPicked")}`);
                    contract.removeListener("WinnerPicked");
                    // console.log(`after ${contract.listenerCount("WinnerPicked")}`);
                }
            };
        }
    }, [isWeb3Enabled]);

    useEffect(() => {
        console.log(`chain changed to ${chainId}`);
        if (isChainIdSupported(chainId)) UpdateUI();
    }, [chainId]);

    useEffect(() => {
        currentAccount = account;
        UpdateUI();
    }, [account]);

    return (
        <div>
            {isWeb3Enabled ? (
                deployedAddress != null ? (
                    <div>
                        <div className="p-2 px-14">
                            {" "}
                            Participation fee :
                            {ethers.utils.formatUnits(participationFee.toString(), "ether")} ETH
                        </div>
                        <div className=" p-2 px-14">
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 rounded-full disabled:opacity-50 disabled:hover:bg-blue-500  
                                w-60"
                                onClick={async function () {
                                    await participateToLottery();
                                }}
                                disabled={
                                    hasPlayerAlreadyParticipated ||
                                    isFetchingHasAlreadyPlayed ||
                                    waitForParticipatation
                                }
                            >
                                {SetButtonTextState()}
                                {isFetchingHasAlreadyPlayed || waitForParticipatation ? (
                                    <svg
                                        className="inline mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                                        viewBox="0 0 100 101"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                            fill="currentFill"
                                        />
                                        <span className="sr-only">Loading...</span>
                                    </svg>
                                ) : (
                                    <div></div>
                                )}
                            </button>
                        </div>
                        <div className="p-5 px-14">
                            {numberOfPlayers} player(s) are participating
                        </div>
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
