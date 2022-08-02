// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "./chainlink/VRFConsumerBaseUpgradeable.sol";

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
contract RaffleV2 is Initializable, VRFConsumerBaseUpgradeable, KeeperCompatibleInterface {
    enum RaffleState {
        Open,
        Calculating
    }

    /* private constant variables */
    uint16 private constant MINIMUM_REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;
    uint16 private constant MINIMUM_PLAYERS_TO_PICK_WINNER = 5;

    /* private storage variables */
    VRFCoordinatorV2Interface private s_vrfCoordinator;
    RaffleState private s_raffleState;
    address payable[] private s_players;
    address private s_winner;
    uint256 private s_participationFee;
    uint256 private s_intervalTime;
    uint256 private s_lastTimestamp;
    bytes32 private s_gasLane;
    uint32 private s_callBackGasLimit;
    uint64 private s_subscriptionId;

    mapping(address => bool) private s_mappingPlayersParticipating;

    /* events */
    event HasParticipated(address indexed player);
    event RequestedWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    function initialize(
        address vrfCoordinatorV2,
        address _linkToken,
        uint256 participationFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 intervalTime
    ) public initializer {
        __VRFConsumerBase_init(vrfCoordinatorV2, _linkToken);
        s_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);

        s_participationFee = participationFee;
        s_gasLane = gasLane;
        s_subscriptionId = subscriptionId;
        s_callBackGasLimit = callBackGasLimit;
        s_intervalTime = intervalTime;
        s_raffleState = RaffleState.Open;
        s_lastTimestamp = block.timestamp;
    }

    /**
     *  @dev Anyone can participate to the lottery subject to payment of a minium participation fee and the lottery is open
     */
    function participate() public payable {
        if (s_raffleState != RaffleState.Open) revert Raffle__NotOpen();
        if (msg.value < s_participationFee) revert Raffle__InsuffisiantFunds();

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
    function fulfillRandomness(
        bytes32, /* requestId */
        uint256 randomness
    ) internal override {
        uint256 indexWinner = randomness % s_players.length;
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
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            s_gasLane,
            s_subscriptionId,
            MINIMUM_REQUEST_CONFIRMATIONS,
            s_callBackGasLimit,
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
        bool timePassed = (block.timestamp - s_lastTimestamp) > s_intervalTime;
        //Do we have a least one player that has particpated to the lottery?
        bool hasEnoughPlayers = (s_players.length >= MINIMUM_PLAYERS_TO_PICK_WINNER);
        //Does the lottery contract retain players fees?
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = isOpen && timePassed && hasBalance && hasEnoughPlayers;
    }

    /**
     *  @dev Retrieves the minimum participation fee to participate to the lottery
     */
    function getParticipationFee() public view returns (uint256 fee) {
        return s_participationFee;
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
        return s_intervalTime;
    }

    /**
     *  @dev Retrieves the callback gas limit used by Chainlink Vrf requestRandomWords() function
        https://docs.chain.link/docs/get-a-random-number/
     */
    function getCallBackGasLimit() public view returns (uint256) {
        return s_callBackGasLimit;
    }

    function test() public pure returns (string memory) {
        return "This is v2!";
    }

    function newInABi() public pure returns (string memory) {
        return "This is v2!";
    }
}
