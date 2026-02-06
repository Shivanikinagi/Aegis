// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITaskRegistry
 * @notice Interface for the Task Registry contract
 */
interface ITaskRegistry {
    // Enums
    enum TaskStatus {
        Created,      // Task created, waiting for assignment
        Assigned,     // Worker assigned, in progress
        Submitted,    // Worker submitted result
        Verified,     // Result verified successfully
        Completed,    // Payment released
        Failed,       // Task failed verification
        Cancelled     // Task cancelled
    }

    enum TaskType {
        DataAnalysis,
        TextGeneration,
        CodeReview,
        Research,
        Computation,
        Other
    }

    // Structs
    struct Task {
        uint256 id;
        TaskType taskType;
        TaskStatus status;
        address creator;
        address assignedWorker;
        uint256 maxPayment;
        uint256 actualPayment;
        uint256 deadline;
        uint256 createdAt;
        uint256 completedAt;
        bytes32 descriptionHash;    // IPFS hash or content hash
        bytes32 resultHash;         // Result hash for verification
        string verificationRule;    // Simple rule like "length > 200"
    }

    struct TaskProposal {
        uint256 taskId;
        address proposedWorker;
        uint256 proposedPayment;
        uint256 proposedAt;
        bool approved;
    }

    // Events
    event TaskCreated(
        uint256 indexed taskId,
        TaskType taskType,
        address indexed creator,
        uint256 maxPayment,
        uint256 deadline
    );
    event TaskAssigned(
        uint256 indexed taskId,
        address indexed worker,
        uint256 payment
    );
    event TaskSubmitted(
        uint256 indexed taskId,
        address indexed worker,
        bytes32 resultHash
    );
    event TaskVerified(uint256 indexed taskId, bool success);
    event TaskCompleted(uint256 indexed taskId, uint256 payment);
    event TaskFailed(uint256 indexed taskId, string reason);
    event TaskCancelled(uint256 indexed taskId);
    event ProposalCreated(
        uint256 indexed taskId,
        address indexed worker,
        uint256 payment
    );
    event ProposalApproved(uint256 indexed taskId);
    event ProposalRejected(uint256 indexed taskId, string reason);

    // View functions
    function getTask(uint256 taskId) external view returns (Task memory);
    function getOpenTasks() external view returns (uint256[] memory);
    function getTasksByWorker(address worker) external view returns (uint256[] memory);
    function getTaskCount() external view returns (uint256);
    function getProposal(uint256 taskId) external view returns (TaskProposal memory);

    // Actions
    function createTask(
        TaskType taskType,
        uint256 maxPayment,
        uint256 deadline,
        bytes32 descriptionHash,
        string calldata verificationRule
    ) external returns (uint256 taskId);

    function proposeAssignment(
        uint256 taskId,
        address worker,
        uint256 payment
    ) external returns (bool);

    function submitResult(uint256 taskId, bytes32 resultHash) external;
    function verifyAndComplete(uint256 taskId, bool success) external;
    function cancelTask(uint256 taskId) external;
}
