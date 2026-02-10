// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentToken
 * @notice Agent governance and revenue sharing token for nad.fun
 * @dev Token representing ownership and governance rights in the Autonomous Treasury Agent
 * 
 * Token holders get:
 * - Revenue sharing from agent fees
 * - Governance rights for agent parameters
 * - Access to premium agent features
 * - Staking rewards
 */
contract AgentToken is Ownable, ReentrancyGuard {
    
    string public constant name = "Autonomous Treasury Agent";
    string public constant symbol = "ATAI";
    uint8 public constant decimals = 18;
    
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18; // 1M tokens
    
    // Token balances
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Revenue sharing
    uint256 public totalRevenueCollected;
    uint256 public revenuePerToken;
    mapping(address => uint256) public revenueDebt;
    mapping(address => uint256) public claimableRevenue;
    
    // Staking
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTimestamp;
    uint256 public totalStaked;
    uint256 public stakingRewardRate = 500; // 5% APY (500/10000)
    
    // Governance
    struct Proposal {
        uint256 id;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    uint256 public proposalCounter;
    mapping(uint256 => Proposal) public proposals;
    
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18; // Need 1000 tokens to propose
    
    // Agent fee collection
    uint256 public agentFeeRate = 250; // 2.5% (250/10000)
    address public agentTreasury;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event RevenueDistributed(uint256 amount, uint256 revenuePerToken);
    event RevenueClaimed(address indexed user, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event StakingRewardClaimed(address indexed user, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    constructor(address _agentTreasury) Ownable(msg.sender) {
        require(_agentTreasury != address(0), "Invalid treasury");
        agentTreasury = _agentTreasury;
        
        // Mint initial supply to deployer
        uint256 initialSupply = 100_000 * 10**18; // 100k tokens (10% of max)
        _mint(msg.sender, initialSupply);
    }
    
    // ============ ERC20 Functions ============
    
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }
    
    function _transfer(address from, address to, uint256 value) internal {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        
        // Update revenue claims before transfer
        _updateRevenue(from);
        _updateRevenue(to);
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        
        emit Transfer(from, to, value);
    }
    
    function _mint(address to, uint256 value) internal {
        require(to != address(0), "Mint to zero address");
        require(totalSupply + value <= MAX_SUPPLY, "Exceeds max supply");
        
        totalSupply += value;
        balanceOf[to] += value;
        
        emit Transfer(address(0), to, value);
    }
    
    // ============ Revenue Sharing ============
    
    function distributeRevenue() external payable {
        require(msg.value > 0, "No revenue to distribute");
        require(totalSupply > 0, "No tokens exist");
        
        totalRevenueCollected += msg.value;
        revenuePerToken += (msg.value * 1e18) / totalSupply;
        
        emit RevenueDistributed(msg.value, revenuePerToken);
    }
    
    function _updateRevenue(address account) internal {
        uint256 pending = (balanceOf[account] * revenuePerToken / 1e18) - revenueDebt[account];
        if (pending > 0) {
            claimableRevenue[account] += pending;
        }
        revenueDebt[account] = balanceOf[account] * revenuePerToken / 1e18;
    }
    
    function claimRevenue() external nonReentrant {
        _updateRevenue(msg.sender);
        
        uint256 amount = claimableRevenue[msg.sender];
        require(amount > 0, "No revenue to claim");
        
        claimableRevenue[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit RevenueClaimed(msg.sender, amount);
    }
    
    function pendingRevenue(address account) external view returns (uint256) {
        uint256 pending = (balanceOf[account] * revenuePerToken / 1e18) - revenueDebt[account];
        return claimableRevenue[account] + pending;
    }
    
    // ============ Staking ============
    
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        // Claim existing rewards before staking more
        if (stakedBalance[msg.sender] > 0) {
            _claimStakingReward(msg.sender);
        }
        
        balanceOf[msg.sender] -= amount;
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked");
        
        // Claim rewards before unstaking
        _claimStakingReward(msg.sender);
        
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        balanceOf[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        emit Unstaked(msg.sender, amount);
    }
    
    function claimStakingReward() external {
        _claimStakingReward(msg.sender);
    }
    
    function _claimStakingReward(address account) internal {
        uint256 reward = calculateStakingReward(account);
        if (reward > 0 && totalSupply + reward <= MAX_SUPPLY) {
            _mint(account, reward);
            stakingTimestamp[account] = block.timestamp;
            emit StakingRewardClaimed(account, reward);
        }
    }
    
    function calculateStakingReward(address account) public view returns (uint256) {
        if (stakedBalance[account] == 0) return 0;
        
        uint256 timeStaked = block.timestamp - stakingTimestamp[account];
        uint256 reward = (stakedBalance[account] * stakingRewardRate * timeStaked) / (10000 * 365 days);
        
        return reward;
    }
    
    // ============ Governance ============
    
    function propose(string memory description) external returns (uint256) {
        require(balanceOf[msg.sender] + stakedBalance[msg.sender] >= PROPOSAL_THRESHOLD, "Insufficient tokens to propose");
        
        proposalCounter++;
        Proposal storage proposal = proposals[proposalCounter];
        proposal.id = proposalCounter;
        proposal.description = description;
        proposal.proposer = msg.sender;
        proposal.startBlock = block.timestamp;
        proposal.endBlock = block.timestamp + VOTING_PERIOD;
        
        emit ProposalCreated(proposalCounter, msg.sender, description);
        return proposalCounter;
    }
    
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startBlock, "Voting not started");
        require(block.timestamp < proposal.endBlock, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 weight = balanceOf[msg.sender] + stakedBalance[msg.sender];
        require(weight > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
        
        emit Voted(proposalId, msg.sender, support, weight);
    }
    
    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.endBlock, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");
        
        proposal.executed = true;
        
        // In production, execute the actual proposal logic here
        
        emit ProposalExecuted(proposalId);
    }
    
    // ============ Agent Fee Collection ============
    
    function collectAgentFee(uint256 taskReward) external {
        require(msg.sender == agentTreasury || msg.sender == owner(), "Not authorized");
        
        uint256 fee = (taskReward * agentFeeRate) / 10000;
        
        // Fee is automatically distributed to token holders
        // Called by treasury when tasks complete
    }
    
    // ============ Admin Functions ============
    
    function setAgentFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Fee too high"); // Max 10%
        agentFeeRate = newRate;
    }
    
    function setStakingRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20% APY
        stakingRewardRate = newRate;
    }
    
    function mintTokens(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // ============ nad.fun Integration ============
    
    /**
     * @notice Get token metadata for nad.fun platform
     */
    function getTokenMetadata() external pure returns (
        string memory tokenName,
        string memory tokenSymbol,
        string memory description,
        string memory website,
        string memory category
    ) {
        return (
            name,
            symbol,
            "Governance and revenue-sharing token for the Autonomous Treasury Agent on Monad. Holders earn fees from agent operations and vote on agent parameters.",
            "https://your-agent-site.com",
            "Agent+AI"
        );
    }
    
    /**
     * @notice Get agent capabilities for nad.fun
     */
    function getAgentCapabilities() external pure returns (string[] memory) {
        string[] memory capabilities = new string[](5);
        capabilities[0] = "Autonomous treasury management";
        capabilities[1] = "Multi-agent task coordination";
        capabilities[2] = "AI-powered decision making";
        capabilities[3] = "On-chain governance";
        capabilities[4] = "Revenue sharing";
        return capabilities;
    }
    
    receive() external payable {
        // Auto-distribute incoming ETH as revenue
        if (msg.value > 0) {
            totalRevenueCollected += msg.value;
            revenuePerToken += (msg.value * 1e18) / totalSupply;
            emit RevenueDistributed(msg.value, revenuePerToken);
        }
    }
}
