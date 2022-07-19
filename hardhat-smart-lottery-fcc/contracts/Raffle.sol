// SPDX-License-Identifier: MIT

pragma solidity 0.8.8;

import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol';

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__NoUpKeepNeeded();

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // enums
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    // State vars
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_COORDINATOR;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private s_callbackGasLimit;
    uint32 private constant NUM_OF_WORDS = 2;

    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;

    address private s_recentWinner;
    RaffleState s_raffleState;

    // Events
    event RaffleEnter(address indexed player);
    event RandomWinner(uint256 indexed winner);
    event RaffleWinnerPicked(address indexed winnerPlayer);

    constructor(
        uint256 entranceFee,
        address vrfCoordinator,
        bytes32 gaslane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_entranceFee = entranceFee;
        i_COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        i_gasLane = gaslane;
        i_subscriptionId = subscriptionId;
        s_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        bool hasBalance = (address(this).balance > 0);
        bool hasPlayers = (s_players.length > 0);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        upkeepNeeded = (isOpen && hasBalance && timePassed && hasPlayers);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep('');

        if (!upkeepNeeded) {
            revert Raffle__NoUpKeepNeeded();
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_COORDINATOR.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            s_callbackGasLimit,
            NUM_OF_WORDS
        );
        emit RandomWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 recentWinnerIndex = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[recentWinnerIndex];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}('');
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit RaffleWinnerPicked(recentWinner);
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }
}
