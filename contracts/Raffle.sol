// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle_HasAlreadyParticipated();
error Raffle__InsuffisiantFunds();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint256 balance, uint256 numberOfPlayers, uint256 raffleState);

/** @title A decentralised lottery
 *  @author Brice Grenard
 *  @notice This contract is a demo of a simple decentralised lottery using Chainlink VRF and Chainlink KeepUp
 *  @dev Both Chainlink VRF and Chainlink KeepUp subscription fundings and time base scheduler configuration are set up on chainlink website
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum RaffleState {
        Open,
        Calculating
    }

    /* private immutable variables */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable i_participationFee;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callBackGasLimit;
    uint256 private immutable i_intervalTime;

    /* private constant variables */
    uint16 private constant MINIMUM_REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    /* private storage variables */
    address payable[] private s_players;
    address private s_winner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimestamp;
    uint256 private s_intervalTime;
    mapping(address => bool) private s_mappingPlayersParticipating;

    /* events */
    event HasParticipated(address indexed player);
    event RequestedWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 participationFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 intervalTime
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_participationFee = participationFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        i_intervalTime = intervalTime;
        s_raffleState = RaffleState.Open;
        s_lastTimestamp = block.timestamp;
    }

    /**
     *  @dev Anyone can participate to the lottery subject to payment of a minium participation fee and the lottery is open
     */
    function participate() public payable {
        if (s_raffleState != RaffleState.Open) revert Raffle__NotOpen();
        if (msg.value < i_participationFee) revert Raffle__InsuffisiantFunds();

        //only one participation by address
        if (hasAlreadyParticipated(msg.sender)) revert Raffle_HasAlreadyParticipated();

        s_players.push(payable(msg.sender));
        s_mappingPlayersParticipating[msg.sender] = true;

        emit HasParticipated(msg.sender);
    }

    /**
     *  @dev This method is called by the chainlink VRF and is responsible to provide a "real" random number
     *  Once we get this number, we are able to pick a winner and transfer to him/her all participants collected funds
     */
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexWinner = randomWords[0] % s_players.length;
        address payable winner = s_players[indexWinner];
        s_winner = winner;

        //reset players list and set raffle state to open state
        for (uint256 i = 0; i < s_players.length; i++) {
            address player = getPlayer(i);
            s_mappingPlayersParticipating[player] = false;
        }
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        s_raffleState = RaffleState.Open;

        //Transfer collected lottery funds to the winner
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) revert Raffle__TransferFailed();

        emit WinnerPicked(winner);
    }

    /**
     *  @dev This method is called by the chainlink keepUp
     */
    function performUpkeep(bytes calldata performData) external override {
        (bool upkeepNeeded, ) = checkUpkeep(performData);
        if (!upkeepNeeded)
            revert Raffle__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );

        s_raffleState = RaffleState.Calculating;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            MINIMUM_REQUEST_CONFIRMATIONS,
            i_callBackGasLimit,
            NUM_WORDS
        );

        emit RequestedWinner(requestId);
    }

    /**
     *  @dev If all here-below conditions are met, we can request for a random number from the performUpkeep function
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        //Is the lottery open?
        bool isOpen = s_raffleState == RaffleState.Open;
        //Have blocks been mined?
        bool timePassed = (block.timestamp - s_lastTimestamp) > i_intervalTime;
        //Do we have a least one player that has particpated to the lottery?
        bool hasPlayers = (s_players.length > 0);
        //Does the lottery contract retain players fees?
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = isOpen && timePassed && hasBalance && hasPlayers;
    }

    /**
     *  @dev Retrieves the minimum participation fee to participate to the lottery
     */
    function getParticipationFee() public view returns (uint256 fee) {
        return i_participationFee;
    }

    /**
     *  @dev Retrieves a player that is participating to the lottery
     */
    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    /**
     *  @dev Retrieves if a player has already participated to the lottery
     */
    function hasAlreadyParticipated(address _address) public view returns (bool) {
        return s_mappingPlayersParticipating[_address];
    }

    /**
     *  @dev Retrieves a previous winner
     *  If no winner has been picked yet, the returned address is null: 0x00000...
     */
    function getWinner() public view returns (address) {
        return s_winner;
    }

    /**
     *  @dev Retrieves the state of the lottery (Open/Close)
     */
    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    /**
     *  @dev Retrieves the number of random numbers we want to work with this contract
     */
    function getNumWords() public pure returns (uint16) {
        return NUM_WORDS;
    }

    /**
     *  @dev Retrieves the number of minimum request confirmations used by Chainlink Vrf requestRandomWords() function
        https://docs.chain.link/docs/get-a-random-number/
     */
    function getNumberOfConfirmations() public pure returns (uint16) {
        return MINIMUM_REQUEST_CONFIRMATIONS;
    }

    /**
     *  @dev Retrieves the number of players who are participating to the lottery
     */
    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    /**
     *  @dev Retrieves the last mined block timestamp
     */
    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    /**
     *  @dev Retrieves the interval time
     */
    function getTimeInterval() public view returns (uint256) {
        return i_intervalTime;
    }

    /**
     *  @dev Retrieves the callback gas limit used by Chainlink Vrf requestRandomWords() function
        https://docs.chain.link/docs/get-a-random-number/
     */
    function getCallBackGasLimit() public view returns (uint256) {
        return i_callBackGasLimit;
    }
}
