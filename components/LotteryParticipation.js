import { useEffect } from "react";
import { useWeb3Contract, useMoralis, isWeb3Enabled } from "react-moralis";
import { contractAddresses, contractAbi } from "../contracts_constants/index";

export default function Participate() {
    const { chainId, isWeb3Enabled } = useMoralis();
    const chainIdStr = parseInt(chainId).toString();
    const lotteryContractAddress =
        chainIdStr in contractAddresses ? contractAddresses[chainIdStr][0] : null;

    const { runContractFunction: getParticipationFee } = useWeb3Contract({
        abi: contractAbi,
        contractAddress: lotteryContractAddress,
        functionName: "getParticipationFee",
        params: {},
    });

    // const { runContractFunction: participate } = useWeb3Contract({
    //     abi: contractAbi,
    //     contractAddress: lotteryContractAddress,
    //     functionName: "participate",
    //     params: {},
    // });

    useEffect(() => {
        if (isWeb3Enabled) {
            async function getUIParticipationFee() {
                if (lotteryContractAddress == null)
                    throw new Error(
                        `No address found for deployed raffle contract with chainId: ${chainIdStr}`
                    );
                const participationFee = await getParticipationFee();
                console.log(participationFee);
            }
            getUIParticipationFee();
        }
    }, [isWeb3Enabled == true]);

    return <div>{chainIdStr}</div>;
}
