// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IWorkerRegistry
 * @notice Interface for the Worker Registry contract
 */
interface IWorkerRegistry {
    // Structs
    struct Worker {
        address workerAddress;
        bool isActive;
        uint256 registeredAt;
        uint256 totalTasks;
        uint256 successfulTasks;
        uint256 totalEarnings;
        uint256 lastTaskAt;
        uint256 reliabilityScore;    // 0-10000 (basis points, 10000 = 100%)
        uint256[] allowedTaskTypes;  // Which task types this worker can do
    }

    struct WorkerStats {
        uint256 totalTasks;
        uint256 successfulTasks;
        uint256 failedTasks;
        uint256 totalEarnings;
        uint256 averageCompletionTime;
        uint256 reliabilityScore;
    }

    // Events
    event WorkerRegistered(address indexed worker, uint256[] allowedTaskTypes);
    event WorkerDeactivated(address indexed worker);
    event WorkerReactivated(address indexed worker);
    event WorkerStatsUpdated(
        address indexed worker,
        uint256 totalTasks,
        uint256 successfulTasks,
        uint256 reliabilityScore
    );
    event WorkerSlashed(address indexed worker, uint256 penaltyAmount);
    event TaskTypesUpdated(address indexed worker, uint256[] newTaskTypes);

    // View functions
    function isWorkerActive(address worker) external view returns (bool);
    function isWorkerAllowed(address worker, uint256 taskType) external view returns (bool);
    function getWorker(address worker) external view returns (Worker memory);
    function getWorkerStats(address worker) external view returns (WorkerStats memory);
    function getAllActiveWorkers() external view returns (address[] memory);
    function getWorkersByTaskType(uint256 taskType) external view returns (address[] memory);
    function getWorkerReliability(address worker) external view returns (uint256);

    // Actions
    function registerWorker(uint256[] calldata allowedTaskTypes) external;
    function deactivateWorker(address worker) external;
    function reactivateWorker(address worker) external;
    function updateWorkerStats(
        address worker,
        bool taskSuccess,
        uint256 earnings,
        uint256 completionTime
    ) external;
    function updateAllowedTaskTypes(address worker, uint256[] calldata taskTypes) external;
    function slashWorker(address worker, uint256 amount) external;
}
