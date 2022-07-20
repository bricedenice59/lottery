import { ConnectButton } from "web3uikit";
import Participate from "@components/LotteryParticipation";

export default function Header() {
    return (
        <div>
            Decentralized lottery
            <ConnectButton moralisAuth={false} />
            <Participate></Participate>
        </div>
    );
}
