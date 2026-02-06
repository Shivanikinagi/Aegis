// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITreasury.sol";

/**
 * @title Treasury
 * @notice Main Treasury contract that holds funds and enforces spending rules
 * @dev This contract controls all fund movements - agents can only propose, not execute
 */
contract Treasury is ITreasury, Ownable, ReentrancyGuard {
    // ============ State Variables ============
    
    TreasuryRules public rules;
    
    address public taskRegistry;
    address public coordinator;
    
    uint256 public totalReserved;
    uint256 public dailySpent;
    uint256 public lastDayReset;
    
    // Task ID => Reserved amount
    mapping(uint256 => uint256) public reservedAmounts;
    
    // ============ Modifiers ============
    
    modifier onlyTaskRegistry() {
        require(msg.sender == taskRegistry, "Treasury: caller is not task registry");
        _;
    }
    
    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Treasury: caller is not coordinator");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == taskRegistry || msg.sender == coordinator || msg.sender == owner(),
            "Treasury: unauthorized"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        uint256 _maxSpendPerTask,
        uint256 _maxSpendPerDay,
        uint256 _minTaskValue,
        uint256 _cooldownPeriod
    ) Ownable(msg.sender) {
        rules = TreasuryRules({
            maxSpendPerTask: _maxSpendPerTask,
            maxSpendPerDay: _maxSpendPerDay,
            minTaskValue: _minTaskValue,
            cooldownPeriod: _cooldownPeriod
        });
        
        lastDayReset = block.timestamp;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Deposit funds into the treasury
     */
    function deposit() external payable override {
        require(msg.value > 0, "Treasury: deposit amount must be > 0");
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Reserve funds for a task (called by TaskRegistry)
     * @param taskId The task ID
     * @param amount The amount to reserve
     */
    function reserveFunds(uint256 taskId, uint256 amount) external override onlyTaskRegistry {
        _resetDailyLimitIfNeeded();
        
        require(amount >= rules.minTaskValue, "Treasury: amount below minimum");
        require(amount <= rules.maxSpendPerTask, "Treasury: exceeds max per task");
        require(dailySpent + amount <= rules.maxSpendPerDay, "Treasury: exceeds daily limit");
        require(amount <= getAvailableBalance(), "Treasury: insufficient available balance");
        require(reservedAmounts[taskId] == 0, "Treasury: funds already reserved for task");
        
        reservedAmounts[taskId] = amount;
        totalReserved += amount;
        
        emit FundsReserved(taskId, amount);
    }
    
    /**
     * @notice Release reserved funds to a worker (called by TaskRegistry on successful verification)
     * @param taskId The task ID
     * @param worker The worker to pay
     */
    function releaseFunds(uint256 taskId, address worker) external override onlyTaskRegistry nonReentrant {
        uint256 amount = reservedAmounts[taskId];
        require(amount > 0, "Treasury: no funds reserved for task");
        require(worker != address(0), "Treasury: invalid worker address");
        
        _resetDailyLimitIfNeeded();
        
        // Update state before transfer
        reservedAmounts[taskId] = 0;
        totalReserved -= amount;
        dailySpent += amount;
        
        // Transfer funds to worker
        (bool success, ) = payable(worker).call{value: amount}("");
        require(success, "Treasury: transfer failed");
        
        emit FundsReleased(taskId, worker, amount);
    }
    
    /**
     * @notice Unlock reserved funds (task cancelled or failed)
     * @param taskId The task ID
     */
    function unlockFunds(uint256 taskId) external override onlyTaskRegistry {
        uint256 amount = reservedAmounts[taskId];
        require(amount > 0, "Treasury: no funds reserved for task");
        
        reservedAmounts[taskId] = 0;
        totalReserved -= amount;
        
        emit FundsUnlocked(taskId, amount);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set the task registry address
     * @param _taskRegistry The task registry contract address
     */
    function setTaskRegistry(address _taskRegistry) external onlyOwner {
        require(_taskRegistry != address(0), "Treasury: invalid address");
        taskRegistry = _taskRegistry;
    }
    
    /**
     * @notice Set the coordinator address
     * @param _coordinator The coordinator agent address
     */
    function setCoordinator(address _coordinator) external onlyOwner {
        require(_coordinator != address(0), "Treasury: invalid address");
        coordinator = _coordinator;
        emit CoordinatorUpdated(_coordinator);
    }
    
    /**
     * @notice Update treasury rules (only owner can do this)
     * @param newRules The new rules to set
     */
    function updateRules(TreasuryRules calldata newRules) external onlyOwner {
        require(newRules.maxSpendPerTask > 0, "Treasury: invalid max per task");
        require(newRules.maxSpendPerDay >= newRules.maxSpendPerTask, "Treasury: invalid daily limit");
        
        rules = newRules;
        emit RulesUpdated(newRules);
    }
    
    /**
     * @notice Emergency withdraw (only owner, for extreme cases)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= getAvailableBalance(), "Treasury: insufficient available balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Treasury: transfer failed");
    }
    
    // ============ View Functions ============
    
    function getBalance() external view override returns (uint256) {
        return address(this).balance;
    }
    
    function getReservedBalance() external view override returns (uint256) {
        return totalReserved;
    }
    
    function getAvailableBalance() public view override returns (uint256) {
        return address(this).balance - totalReserved;
    }
    
    function getDailySpent() external view override returns (uint256) {
        if (block.timestamp >= lastDayReset + 1 days) {
            return 0; // Would be reset
        }
        return dailySpent;
    }
    
    function getRules() external view override returns (TreasuryRules memory) {
        return rules;
    }
    
    function getReservedAmount(uint256 taskId) external view override returns (uint256) {
        return reservedAmounts[taskId];
    }
    
    function getRemainingDailyBudget() external view returns (uint256) {
        if (block.timestamp >= lastDayReset + 1 days) {
            return rules.maxSpendPerDay;
        }
        return rules.maxSpendPerDay > dailySpent ? rules.maxSpendPerDay - dailySpent : 0;
    }
    
    // ============ Internal Functions ============
    
    function _resetDailyLimitIfNeeded() internal {
        if (block.timestamp >= lastDayReset + 1 days) {
            dailySpent = 0;
            lastDayReset = block.timestamp;
        }
    }
    
    // ============ Receive Function ============
    
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
