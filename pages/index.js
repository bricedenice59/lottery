import Head from "next/head";
import Participate from "@components/LotteryParticipation";
import { ConnectButton } from "web3uikit";
import { contractAddresses } from "../contracts_constants/index";
import { useMoralis } from "react-moralis";
import { useEffect, useState } from "react";

export default function Home() {
    const { isWeb3Enabled, chainId } = useMoralis();
    const [isChainIdSupported, setIsChainIdSupported] = useState(false);

    function isChainSupported(chainIdParam) {
        return chainIdParam in contractAddresses;
    }

    useEffect(() => {
        const newChainId = parseInt(chainId).toString();
        const supported = isChainSupported(newChainId);
        setIsChainIdSupported(supported);
    }, [chainId]);

    return (
        <div className="grid place-items-center">
            <Head>
                <title>Create Next App</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <h1 className="py-4 px-4 font-blog text-3xl">Decentralized lottery</h1>
            <ConnectButton moralisAuth={false} />

            {isWeb3Enabled && !isChainIdSupported ? (
                <div>Please switch to a supported chainId (Rinkeby).</div>
            ) : (
                <Participate />
            )}
        </div>
    );
}
