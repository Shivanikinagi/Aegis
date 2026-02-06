// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITaskRegistry.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IWorkerRegistry.sol";

/**
 * @title TaskRegistry
 * @notice Manages task lifecycle from creation to completion
 * @dev Coordinates between Treasury and WorkerRegistry for secure task execution
 */
contract TaskRegistry is ITaskRegistry, Ownable {
    // ============ State Variables ============
    
    ITreasury public treasury;
    IWorkerRegistry public workerRegistry;
    address public coordinator;
    
    uint256 public taskCounter;
    
    // Task ID => Task data
    mapping(uint256 => Task) public tasks;
    
    // Task ID => Proposal
    mapping(uint256 => TaskProposal) public proposals;
    
    // Array of open task IDs
    uint256[] public openTaskIds;
    
    // Worker => Array of their task IDs
    mapping(address => uint256[]) public workerTasks;
    
    // Task ID => Index in openTaskIds (for efficient removal)
    mapping(uint256 => uint256) public openTaskIndex;
    
    // ============ Modifiers ============
    
    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "TaskRegistry: caller is not coordinator");
        _;
    }
    
    modifier onlyAssignedWorker(uint256 taskId) {
        require(
            tasks[taskId].assignedWorker == msg.sender,
            "TaskRegistry: caller is not assigned worker"
        );
        _;
    }
    
    modifier taskExists(uint256 taskId) {
        require(tasks[taskId].id == taskId && taskId > 0, "TaskRegistry: task does not exist");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _treasury, address _workerRegistry) Ownable(msg.sender) {
        require(_treasury != address(0) && _workerRegistry != address(0), "TaskRegistry: invalid addresses");
        treasury = ITreasury(_treasury);
        workerRegistry = IWorkerRegistry(_workerRegistry);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new task
     * @param taskType The type of task
     * @param maxPayment Maximum payment for the task
     * @param deadline Task deadline timestamp
     * @param descriptionHash IPFS or content hash of task description
     * @param verificationRule Simple verification rule (e.g., "length > 200")
     * @return taskId The created task ID
     */
    function createTask(
        TaskType taskType,
        uint256 maxPayment,
        uint256 deadline,
        bytes32 descriptionHash,
        string calldata verificationRule
    ) external override returns (uint256 taskId) {
        require(deadline > block.timestamp, "TaskRegistry: deadline must be in future");
        require(maxPayment > 0, "TaskRegistry: max payment must be > 0");
        
        taskCounter++;
        taskId = taskCounter;
        
        tasks[taskId] = Task({
            id: taskId,
            taskType: taskType,
            status: TaskStatus.Created,
            creator: msg.sender,
            assignedWorker: address(0),
            maxPayment: maxPayment,
            actualPayment: 0,
            deadline: deadline,
            createdAt: block.timestamp,
            completedAt: 0,
            descriptionHash: descriptionHash,
            resultHash: bytes32(0),
            verificationRule: verificationRule
        });
        
        // Add to open tasks
        openTaskIndex[taskId] = openTaskIds.length;
        openTaskIds.push(taskId);
        
        emit TaskCreated(taskId, taskType, msg.sender, maxPayment, deadline);
        
        return taskId;
    }
    
    /**
     * @notice Propose a worker assignment for a task (coordinator only)
     * @param taskId The task to assign
     * @param worker The proposed worker
     * @param payment The proposed payment amount
     * @return success Whether the proposal was accepted
     */
    function proposeAssignment(
        uint256 taskId,
        address worker,
        uint256 payment
    ) external override onlyCoordinator taskExists(taskId) returns (bool success) {
        Task storage task = tasks[taskId];
        
        // Validation checks
        require(task.status == TaskStatus.Created, "TaskRegistry: task not open");
        require(block.timestamp < task.deadline, "TaskRegistry: task expired");
        require(payment <= task.maxPayment, "TaskRegistry: payment exceeds max");
        
        // Check worker is valid for this task type
        require(
            workerRegistry.isWorkerAllowed(worker, uint256(task.taskType)),
            "TaskRegistry: worker not allowed for task type"
        );
        
        // Store proposal
        proposals[taskId] = TaskProposal({
            taskId: taskId,
            proposedWorker: worker,
            proposedPayment: payment,
            proposedAt: block.timestamp,
            approved: false
        });
        
        emit ProposalCreated(taskId, worker, payment);
        
        // Try to reserve funds in treasury
        try treasury.reserveFunds(taskId, payment) {
            // Funds reserved successfully - approve and assign
            proposals[taskId].approved = true;
            
            task.status = TaskStatus.Assigned;
            task.assignedWorker = worker;
            task.actualPayment = payment;
            
            // Add to worker's tasks
            workerTasks[worker].push(taskId);
            
            // Remove from open tasks
            _removeFromOpenTasks(taskId);
            
            emit ProposalApproved(taskId);
            emit TaskAssigned(taskId, worker, payment);
            
            return true;
        } catch Error(string memory reason) {
            emit ProposalRejected(taskId, reason);
            return false;
        } catch {
            emit ProposalRejected(taskId, "Treasury reservation failed");
            return false;
        }
    }
    
    /**
     * @notice Submit task result (assigned worker only)
     * @param taskId The task ID
     * @param resultHash Hash of the result data
     */
    function submitResult(
        uint256 taskId,
        bytes32 resultHash
    ) external override taskExists(taskId) onlyAssignedWorker(taskId) {
        Task storage task = tasks[taskId];
        
        require(task.status == TaskStatus.Assigned, "TaskRegistry: task not assigned");
        require(block.timestamp <= task.deadline, "TaskRegistry: deadline passed");
        require(resultHash != bytes32(0), "TaskRegistry: invalid result hash");
        
        task.status = TaskStatus.Submitted;
        task.resultHash = resultHash;
        
        emit TaskSubmitted(taskId, msg.sender, resultHash);
    }
    
    /**
     * @notice Verify result and complete task (coordinator only)
     * @param taskId The task ID
     * @param success Whether verification passed
     */
    function verifyAndComplete(
        uint256 taskId,
        bool success
    ) external override onlyCoordinator taskExists(taskId) {
        Task storage task = tasks[taskId];
        
        require(
            task.status == TaskStatus.Submitted || task.status == TaskStatus.Assigned,
            "TaskRegistry: invalid task status"
        );
        
        emit TaskVerified(taskId, success);
        
        if (success) {
            task.status = TaskStatus.Verified;
            
            // Release funds to worker
            treasury.releaseFunds(taskId, task.assignedWorker);
            
            task.status = TaskStatus.Completed;
            task.completedAt = block.timestamp;
            
            // Update worker stats
            uint256 completionTime = block.timestamp - task.createdAt;
            workerRegistry.updateWorkerStats(
                task.assignedWorker,
                true,
                task.actualPayment,
                completionTime
            );
            
            emit TaskCompleted(taskId, task.actualPayment);
        } else {
            task.status = TaskStatus.Failed;
            
            // Unlock funds back to treasury
            treasury.unlockFunds(taskId);
            
            // Update worker stats (failure)
            workerRegistry.updateWorkerStats(task.assignedWorker, false, 0, 0);
            
            emit TaskFailed(taskId, "Verification failed");
        }
    }
    
    /**
     * @notice Cancel a task (creator or owner only)
     * @param taskId The task ID
     */
    function cancelTask(uint256 taskId) external override taskExists(taskId) {
        Task storage task = tasks[taskId];
        
        require(
            msg.sender == task.creator || msg.sender == owner(),
            "TaskRegistry: not authorized"
        );
        require(
            task.status == TaskStatus.Created || task.status == TaskStatus.Assigned,
            "TaskRegistry: cannot cancel"
        );
        
        TaskStatus previousStatus = task.status;
        task.status = TaskStatus.Cancelled;
        
        // If funds were reserved, unlock them
        if (previousStatus == TaskStatus.Assigned) {
            treasury.unlockFunds(taskId);
        }
        
        // Remove from open tasks if still there
        if (previousStatus == TaskStatus.Created) {
            _removeFromOpenTasks(taskId);
        }
        
        emit TaskCancelled(taskId);
    }
    
    /**
     * @notice Handle expired tasks (anyone can call)
     * @param taskId The task ID to check
     */
    function handleExpiredTask(uint256 taskId) external taskExists(taskId) {
        Task storage task = tasks[taskId];
        
        require(block.timestamp > task.deadline, "TaskRegistry: task not expired");
        require(
            task.status == TaskStatus.Created || task.status == TaskStatus.Assigned,
            "TaskRegistry: task already processed"
        );
        
        TaskStatus previousStatus = task.status;
        task.status = TaskStatus.Failed;
        
        if (previousStatus == TaskStatus.Assigned) {
            // Unlock reserved funds
            treasury.unlockFunds(taskId);
            
            // Penalize worker for not submitting
            workerRegistry.updateWorkerStats(task.assignedWorker, false, 0, 0);
        }
        
        if (previousStatus == TaskStatus.Created) {
            _removeFromOpenTasks(taskId);
        }
        
        emit TaskFailed(taskId, "Task expired");
    }
    
    // ============ Admin Functions ============
    
    function setCoordinator(address _coordinator) external onlyOwner {
        require(_coordinator != address(0), "TaskRegistry: invalid address");
        coordinator = _coordinator;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "TaskRegistry: invalid address");
        treasury = ITreasury(_treasury);
    }
    
    function setWorkerRegistry(address _workerRegistry) external onlyOwner {
        require(_workerRegistry != address(0), "TaskRegistry: invalid address");
        workerRegistry = IWorkerRegistry(_workerRegistry);
    }
    
    // ============ View Functions ============
    
    function getTask(uint256 taskId) external view override returns (Task memory) {
        return tasks[taskId];
    }
    
    function getOpenTasks() external view override returns (uint256[] memory) {
        return openTaskIds;
    }
    
    function getTasksByWorker(address worker) external view override returns (uint256[] memory) {
        return workerTasks[worker];
    }
    
    function getTaskCount() external view override returns (uint256) {
        return taskCounter;
    }
    
    function getProposal(uint256 taskId) external view override returns (TaskProposal memory) {
        return proposals[taskId];
    }
    
    function getOpenTaskCount() external view returns (uint256) {
        return openTaskIds.length;
    }
    
    // ============ Internal Functions ============
    
    function _removeFromOpenTasks(uint256 taskId) internal {
        uint256 index = openTaskIndex[taskId];
        uint256 lastIndex = openTaskIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastTaskId = openTaskIds[lastIndex];
            openTaskIds[index] = lastTaskId;
            openTaskIndex[lastTaskId] = index;
        }
        
        openTaskIds.pop();
        delete openTaskIndex[taskId];
    }
}
