// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWorkerRegistry.sol";

/**
 * @title WorkerRegistry
 * @notice Manages worker registration, permissions, and performance tracking
 * @dev Workers must be registered and active to receive task assignments
 */
contract WorkerRegistry is IWorkerRegistry, Ownable {
    // ============ State Variables ============
    
    address public taskRegistry;
    address public coordinator;
    
    // Worker address => Worker data
    mapping(address => Worker) public workers;
    
    // Array of all worker addresses (for iteration)
    address[] public workerList;
    
    // Task type => Array of workers
    mapping(uint256 => address[]) public workersByTaskType;
    
    // Worker => Task type => is allowed
    mapping(address => mapping(uint256 => bool)) public workerTaskTypes;
    
    // ============ Modifiers ============
    
    modifier onlyTaskRegistry() {
        require(msg.sender == taskRegistry, "WorkerRegistry: caller is not task registry");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == taskRegistry || msg.sender == coordinator || msg.sender == owner(),
            "WorkerRegistry: unauthorized"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ External Functions ============
    
    /**
     * @notice Register a new worker
     * @param allowedTaskTypes Array of task type IDs the worker can perform
     */
    function registerWorker(uint256[] calldata allowedTaskTypes) external override {
        require(!workers[msg.sender].isActive, "WorkerRegistry: already registered");
        require(allowedTaskTypes.length > 0, "WorkerRegistry: must specify task types");
        
        workers[msg.sender] = Worker({
            workerAddress: msg.sender,
            isActive: true,
            registeredAt: block.timestamp,
            totalTasks: 0,
            successfulTasks: 0,
            totalEarnings: 0,
            lastTaskAt: 0,
            reliabilityScore: 5000,  // Start at 50%
            allowedTaskTypes: allowedTaskTypes
        });
        
        workerList.push(msg.sender);
        
        // Add to task type mappings
        for (uint256 i = 0; i < allowedTaskTypes.length; i++) {
            workerTaskTypes[msg.sender][allowedTaskTypes[i]] = true;
            workersByTaskType[allowedTaskTypes[i]].push(msg.sender);
        }
        
        emit WorkerRegistered(msg.sender, allowedTaskTypes);
    }
    
    /**
     * @notice Deactivate a worker (owner or self)
     * @param worker The worker address to deactivate
     */
    function deactivateWorker(address worker) external override {
        require(
            msg.sender == worker || msg.sender == owner(),
            "WorkerRegistry: not authorized"
        );
        require(workers[worker].isActive, "WorkerRegistry: worker not active");
        
        workers[worker].isActive = false;
        emit WorkerDeactivated(worker);
    }
    
    /**
     * @notice Reactivate a worker (owner only)
     * @param worker The worker address to reactivate
     */
    function reactivateWorker(address worker) external override onlyOwner {
        require(workers[worker].workerAddress != address(0), "WorkerRegistry: worker not registered");
        require(!workers[worker].isActive, "WorkerRegistry: worker already active");
        
        workers[worker].isActive = true;
        emit WorkerReactivated(worker);
    }
    
    /**
     * @notice Update worker stats after task completion (called by TaskRegistry)
     * @param worker The worker address
     * @param taskSuccess Whether the task was successful
     * @param earnings The earnings from this task
     * @param completionTime Time taken to complete the task
     */
    function updateWorkerStats(
        address worker,
        bool taskSuccess,
        uint256 earnings,
        uint256 completionTime
    ) external override onlyTaskRegistry {
        require(workers[worker].isActive, "WorkerRegistry: worker not active");
        
        Worker storage w = workers[worker];
        w.totalTasks++;
        w.lastTaskAt = block.timestamp;
        
        if (taskSuccess) {
            w.successfulTasks++;
            w.totalEarnings += earnings;
            
            // Increase reliability score (max 10000)
            uint256 increase = 200; // +2%
            w.reliabilityScore = w.reliabilityScore + increase > 10000 
                ? 10000 
                : w.reliabilityScore + increase;
        } else {
            // Decrease reliability score (min 0)
            uint256 decrease = 500; // -5%
            w.reliabilityScore = w.reliabilityScore >= decrease 
                ? w.reliabilityScore - decrease 
                : 0;
        }
        
        emit WorkerStatsUpdated(
            worker,
            w.totalTasks,
            w.successfulTasks,
            w.reliabilityScore
        );
    }
    
    /**
     * @notice Update allowed task types for a worker
     * @param worker The worker address
     * @param taskTypes The new array of allowed task types
     */
    function updateAllowedTaskTypes(
        address worker,
        uint256[] calldata taskTypes
    ) external override onlyOwner {
        require(workers[worker].workerAddress != address(0), "WorkerRegistry: worker not registered");
        
        // Clear old task type mappings
        uint256[] memory oldTypes = workers[worker].allowedTaskTypes;
        for (uint256 i = 0; i < oldTypes.length; i++) {
            workerTaskTypes[worker][oldTypes[i]] = false;
        }
        
        // Set new task types
        workers[worker].allowedTaskTypes = taskTypes;
        for (uint256 i = 0; i < taskTypes.length; i++) {
            workerTaskTypes[worker][taskTypes[i]] = true;
        }
        
        emit TaskTypesUpdated(worker, taskTypes);
    }
    
    /**
     * @notice Slash a worker (reduce reliability score)
     * @param worker The worker to slash
     * @param amount The penalty amount (in basis points)
     */
    function slashWorker(address worker, uint256 amount) external override onlyAuthorized {
        require(workers[worker].isActive, "WorkerRegistry: worker not active");
        
        Worker storage w = workers[worker];
        w.reliabilityScore = w.reliabilityScore >= amount 
            ? w.reliabilityScore - amount 
            : 0;
        
        // Deactivate if reliability too low
        if (w.reliabilityScore < 1000) { // Below 10%
            w.isActive = false;
            emit WorkerDeactivated(worker);
        }
        
        emit WorkerSlashed(worker, amount);
    }
    
    // ============ Admin Functions ============
    
    function setTaskRegistry(address _taskRegistry) external onlyOwner {
        require(_taskRegistry != address(0), "WorkerRegistry: invalid address");
        taskRegistry = _taskRegistry;
    }
    
    function setCoordinator(address _coordinator) external onlyOwner {
        require(_coordinator != address(0), "WorkerRegistry: invalid address");
        coordinator = _coordinator;
    }
    
    // ============ View Functions ============
    
    function isWorkerActive(address worker) external view override returns (bool) {
        return workers[worker].isActive;
    }
    
    function isWorkerAllowed(address worker, uint256 taskType) external view override returns (bool) {
        return workers[worker].isActive && workerTaskTypes[worker][taskType];
    }
    
    function getWorker(address worker) external view override returns (Worker memory) {
        return workers[worker];
    }
    
    function getWorkerStats(address worker) external view override returns (WorkerStats memory) {
        Worker memory w = workers[worker];
        return WorkerStats({
            totalTasks: w.totalTasks,
            successfulTasks: w.successfulTasks,
            failedTasks: w.totalTasks - w.successfulTasks,
            totalEarnings: w.totalEarnings,
            averageCompletionTime: 0, // Would need to track this separately
            reliabilityScore: w.reliabilityScore
        });
    }
    
    function getAllActiveWorkers() external view override returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < workerList.length; i++) {
            if (workers[workerList[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeWorkers = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < workerList.length; i++) {
            if (workers[workerList[i]].isActive) {
                activeWorkers[index] = workerList[i];
                index++;
            }
        }
        
        return activeWorkers;
    }
    
    function getWorkersByTaskType(uint256 taskType) external view override returns (address[] memory) {
        address[] memory allWorkers = workersByTaskType[taskType];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allWorkers.length; i++) {
            if (workers[allWorkers[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeWorkers = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allWorkers.length; i++) {
            if (workers[allWorkers[i]].isActive) {
                activeWorkers[index] = allWorkers[i];
                index++;
            }
        }
        
        return activeWorkers;
    }
    
    function getWorkerReliability(address worker) external view override returns (uint256) {
        return workers[worker].reliabilityScore;
    }
    
    function getWorkerCount() external view returns (uint256) {
        return workerList.length;
    }
}
