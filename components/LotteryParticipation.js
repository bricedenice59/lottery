import { useEffect, useState } from "react";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

var deployedAddress;

export default function Participate() {
    const { Moralis, chainId, isWeb3Enabled } = useMoralis();
    const { runContractFunction } = useWeb3Contract();
    const [participationFee, setParticipationFee] = useState("0");
    const [chainIdStr, setChainId] = useState("1");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0");

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
        console.log(tx);
        await tx.wait(1);
        handleNotification(tx);
        await fetchNumberOfParticipants();
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

    useEffect(() => {
        if (isWeb3Enabled) {
            setChainId(parseInt(chainId).toString());
            deployedAddress = getLotteryDeployedAddress(chainId);
            if (deployedAddress != null) {
                fetchParticipationFee().catch(console.error);
                fetchNumberOfParticipants();
            }
        }
    }, [isWeb3Enabled == true]);

    useEffect(() => {
        Moralis.onChainChanged(async function (chain) {
            setChainId(parseInt(chain).toString());
            deployedAddress = getLotteryDeployedAddress(chain);
            if (deployedAddress != null) {
                fetchParticipationFee();
                fetchNumberOfParticipants();
            }
        });
    }, []);

    return (
        <div>
            {isWeb3Enabled ? (
                deployedAddress != null ? (
                    <div>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
                            onClick={async function () {
                                await participateToLottery();
                            }}
                            // disabled={isLoading || isFetching}
                        >
                            Participate
                        </button>
                        Participation fee :
                        {ethers.utils.formatUnits(participationFee.toString(), "ether")} ETH
                        <div>{numberOfPlayers} players are participating</div>
                    </div>
                ) : (
                    <div>
                        No address found for deployed raffle contract with chainId: {chainIdStr}
                    </div>
                )
            ) : (
                <div></div>
            )}
        </div>
    );
}
