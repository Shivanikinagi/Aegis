// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITreasury
 * @notice Interface for the Treasury contract
 */
interface ITreasury {
    // Structs
    struct TreasuryRules {
        uint256 maxSpendPerTask;      // Maximum spend per single task
        uint256 maxSpendPerDay;       // Maximum total spend per day
        uint256 minTaskValue;         // Minimum task value
        uint256 cooldownPeriod;       // Cooldown between tasks for same worker
    }

    // Events
    event FundsDeposited(address indexed depositor, uint256 amount);
    event FundsReserved(uint256 indexed taskId, uint256 amount);
    event FundsReleased(uint256 indexed taskId, address indexed worker, uint256 amount);
    event FundsUnlocked(uint256 indexed taskId, uint256 amount);
    event RulesUpdated(TreasuryRules newRules);
    event CoordinatorUpdated(address indexed newCoordinator);

    // View functions
    function getBalance() external view returns (uint256);
    function getReservedBalance() external view returns (uint256);
    function getAvailableBalance() external view returns (uint256);
    function getDailySpent() external view returns (uint256);
    function getRules() external view returns (TreasuryRules memory);
    function getReservedAmount(uint256 taskId) external view returns (uint256);

    // Actions
    function deposit() external payable;
    function reserveFunds(uint256 taskId, uint256 amount) external;
    function releaseFunds(uint256 taskId, address worker) external;
    function unlockFunds(uint256 taskId) external;
}
