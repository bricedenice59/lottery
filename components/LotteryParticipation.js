import { useEffect, useState } from "react";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";
import { ethers } from "ethers";

export default function Participate() {
    const { Moralis, chainId, isWeb3Enabled } = useMoralis();
    const { runContractFunction } = useWeb3Contract();
    const [participationFee, setParticipationFee] = useState("0");
    const [chainIdStr, setChainId] = useState("1");
    const [contractAddress, setcontractAddress] = useState(null);

    var lotteryContractAddress = null;

    const participateToLottery = async () => {
        const optionsParticipate = {
            abi: contractAbi,
            contractAddress: contractAddress,
            functionName: "participate",
            params: {},
            msgValue: participationFee,
        };
        console.log(optionsParticipate);
        await runContractFunction({
            params: optionsParticipate,
        });
    };

    const fetchParticipationFee = async (fromChain) => {
        const newChainIdStr = parseInt(fromChain).toString();

        if (newChainIdStr in contractAddresses)
            lotteryContractAddress = contractAddresses[newChainIdStr][0];
        else lotteryContractAddress = null;

        setChainId(newChainIdStr);
        setcontractAddress(lotteryContractAddress);

        if (lotteryContractAddress != null) {
            const optionsGetParticipationFee = {
                abi: contractAbi,
                contractAddress: lotteryContractAddress,
                functionName: "getParticipationFee",
                params: {},
            };
            const lotteryParticipationFee = await runContractFunction({
                params: optionsGetParticipationFee,
            });

            setParticipationFee(lotteryParticipationFee);
        }
    };

    useEffect(() => {
        if (isWeb3Enabled) {
            fetchParticipationFee(chainId).catch(console.error);
        }
    }, [isWeb3Enabled == true]);

    useEffect(() => {
        Moralis.onChainChanged(async function (chain) {
            await fetchParticipationFee(chain).catch(console.error);
        });
    }, []);

    return (
        <div>
            {contractAddress != null ? (
                <div>
                    <button
                        onClick={async function () {
                            await participateToLottery();
                        }}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
                    >
                        Participate
                    </button>
                    Participation fee :
                    {ethers.utils.formatUnits(participationFee.toString(), "ether")} ETH
                </div>
            ) : (
                <div>No address found for deployed raffle contract with chainId: {chainIdStr}</div>
            )}
        </div>
    );
}
