// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/ITaskRegistry.sol";

/**
 * @title AgentMarketplace
 * @notice Enables agent-to-agent negotiation, bidding, and transactions
 * @dev Core feature for multi-agent systems where agents compete and collaborate
 */
contract AgentMarketplace is Ownable, ReentrancyGuard {
    
    struct AgentProfile {
        address agentAddress;
        string name;
        string capabilities;
        uint256 reputation;
        uint256 totalBidsWon;
        uint256 totalTasksCompleted;
        bool isActive;
        uint256 registeredAt;
    }
    
    struct Bid {
        uint256 bidId;
        uint256 taskId;
        address bidder;
        uint256 proposedPrice;
        uint256 estimatedTime; // in seconds
        string proposal;
        BidStatus status;
        uint256 createdAt;
    }
    
    struct Negotiation {
        uint256 negotiationId;
        uint256 taskId;
        address initiator;
        address counterparty;
        uint256 initiatorOffer;
        uint256 counterpartyOffer;
        NegotiationStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    enum BidStatus { Active, Accepted, Rejected, Withdrawn }
    enum NegotiationStatus { Proposed, CounterOffered, Accepted, Rejected, Expired }
    
    // State variables
    ITaskRegistry public taskRegistry;
    ITreasury public treasury;
    
    uint256 public bidCounter;
    uint256 public negotiationCounter;
    uint256 public agentCounter;
    
    // Mappings
    mapping(address => AgentProfile) public agents;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => Negotiation) public negotiations;
    mapping(uint256 => uint256[]) public taskBids; // taskId => bidIds[]
    mapping(address => uint256[]) public agentBids; // agentAddress => bidIds[]
    mapping(uint256 => uint256) public taskWinningBid; // taskId => bidId
    
    // Events
    event AgentRegistered(address indexed agent, string name, uint256 agentId);
    event BidSubmitted(uint256 indexed bidId, uint256 indexed taskId, address indexed bidder, uint256 price);
    event BidAccepted(uint256 indexed bidId, uint256 indexed taskId, address indexed winner);
    event BidRejected(uint256 indexed bidId, uint256 indexed taskId);
    event BidWithdrawn(uint256 indexed bidId, address indexed bidder);
    event NegotiationStarted(uint256 indexed negotiationId, uint256 indexed taskId, address initiator, address counterparty);
    event NegotiationCounterOffer(uint256 indexed negotiationId, address indexed offerer, uint256 amount);
    event NegotiationAccepted(uint256 indexed negotiationId, uint256 finalPrice);
    event NegotiationRejected(uint256 indexed negotiationId);
    event AgentPaid(address indexed from, address indexed to, uint256 amount, string reason);
    event ReputationUpdated(address indexed agent, uint256 newReputation);
    
    constructor(address _taskRegistry, address _treasury) Ownable(msg.sender) {
        require(_taskRegistry != address(0) && _treasury != address(0), "Invalid addresses");
        taskRegistry = ITaskRegistry(_taskRegistry);
        treasury = ITreasury(_treasury);
    }
    
    // ============ Agent Registration ============
    
    function registerAgent(string memory _name, string memory _capabilities) external {
        require(agents[msg.sender].agentAddress == address(0), "Agent already registered");
        
        agentCounter++;
        agents[msg.sender] = AgentProfile({
            agentAddress: msg.sender,
            name: _name,
            capabilities: _capabilities,
            reputation: 5000, // Start with 50% reputation
            totalBidsWon: 0,
            totalTasksCompleted: 0,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        emit AgentRegistered(msg.sender, _name, agentCounter);
    }
    
    function updateAgentProfile(string memory _capabilities) external {
        require(agents[msg.sender].agentAddress != address(0), "Agent not registered");
        agents[msg.sender].capabilities = _capabilities;
    }
    
    function deactivateAgent() external {
        require(agents[msg.sender].agentAddress != address(0), "Agent not registered");
        agents[msg.sender].isActive = false;
    }
    
    function activateAgent() external {
        require(agents[msg.sender].agentAddress != address(0), "Agent not registered");
        agents[msg.sender].isActive = true;
    }
    
    // ============ Bidding System ============
    
    function submitBid(
        uint256 _taskId,
        uint256 _proposedPrice,
        uint256 _estimatedTime,
        string memory _proposal
    ) external returns (uint256) {
        require(agents[msg.sender].isActive, "Agent not active");
        require(_proposedPrice > 0, "Invalid price");
        
        bidCounter++;
        bids[bidCounter] = Bid({
            bidId: bidCounter,
            taskId: _taskId,
            bidder: msg.sender,
            proposedPrice: _proposedPrice,
            estimatedTime: _estimatedTime,
            proposal: _proposal,
            status: BidStatus.Active,
            createdAt: block.timestamp
        });
        
        taskBids[_taskId].push(bidCounter);
        agentBids[msg.sender].push(bidCounter);
        
        emit BidSubmitted(bidCounter, _taskId, msg.sender, _proposedPrice);
        return bidCounter;
    }
    
    function withdrawBid(uint256 _bidId) external {
        require(bids[_bidId].bidder == msg.sender, "Not your bid");
        require(bids[_bidId].status == BidStatus.Active, "Bid not active");
        
        bids[_bidId].status = BidStatus.Withdrawn;
        emit BidWithdrawn(_bidId, msg.sender);
    }
    
    function acceptBid(uint256 _bidId) external onlyOwner {
        Bid storage bid = bids[_bidId];
        require(bid.status == BidStatus.Active, "Bid not active");
        
        bid.status = BidStatus.Accepted;
        taskWinningBid[bid.taskId] = _bidId;
        
        // Update agent stats
        agents[bid.bidder].totalBidsWon++;
        
        emit BidAccepted(_bidId, bid.taskId, bid.bidder);
    }
    
    function rejectBid(uint256 _bidId) external onlyOwner {
        require(bids[_bidId].status == BidStatus.Active, "Bid not active");
        
        bids[_bidId].status = BidStatus.Rejected;
        emit BidRejected(_bidId, bids[_bidId].taskId);
    }
    
    // ============ Negotiation System ============
    
    function startNegotiation(
        uint256 _taskId,
        address _counterparty,
        uint256 _initialOffer
    ) external returns (uint256) {
        require(agents[msg.sender].isActive, "Agent not active");
        require(agents[_counterparty].isActive, "Counterparty not active");
        require(_initialOffer > 0, "Invalid offer");
        
        negotiationCounter++;
        negotiations[negotiationCounter] = Negotiation({
            negotiationId: negotiationCounter,
            taskId: _taskId,
            initiator: msg.sender,
            counterparty: _counterparty,
            initiatorOffer: _initialOffer,
            counterpartyOffer: 0,
            status: NegotiationStatus.Proposed,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        emit NegotiationStarted(negotiationCounter, _taskId, msg.sender, _counterparty);
        return negotiationCounter;
    }
    
    function counterOffer(uint256 _negotiationId, uint256 _counterOffer) external {
        Negotiation storage neg = negotiations[_negotiationId];
        require(neg.counterparty == msg.sender, "Not authorized");
        require(neg.status == NegotiationStatus.Proposed || neg.status == NegotiationStatus.CounterOffered, "Invalid status");
        require(_counterOffer > 0, "Invalid offer");
        
        neg.counterpartyOffer = _counterOffer;
        neg.status = NegotiationStatus.CounterOffered;
        neg.updatedAt = block.timestamp;
        
        emit NegotiationCounterOffer(_negotiationId, msg.sender, _counterOffer);
    }
    
    function acceptNegotiation(uint256 _negotiationId) external {
        Negotiation storage neg = negotiations[_negotiationId];
        require(
            msg.sender == neg.initiator || msg.sender == neg.counterparty,
            "Not authorized"
        );
        require(neg.status == NegotiationStatus.CounterOffered, "No counter offer");
        
        neg.status = NegotiationStatus.Accepted;
        neg.updatedAt = block.timestamp;
        
        uint256 finalPrice = neg.counterpartyOffer;
        emit NegotiationAccepted(_negotiationId, finalPrice);
    }
    
    function rejectNegotiation(uint256 _negotiationId) external {
        Negotiation storage neg = negotiations[_negotiationId];
        require(
            msg.sender == neg.initiator || msg.sender == neg.counterparty,
            "Not authorized"
        );
        require(
            neg.status == NegotiationStatus.Proposed || neg.status == NegotiationStatus.CounterOffered,
            "Invalid status"
        );
        
        neg.status = NegotiationStatus.Rejected;
        neg.updatedAt = block.timestamp;
        
        emit NegotiationRejected(_negotiationId);
    }
    
    // ============ Agent-to-Agent Payments ============
    
    function payAgent(address _to, uint256 _amount, string memory _reason) external nonReentrant {
        require(agents[msg.sender].isActive, "Agent not active");
        require(agents[_to].isActive, "Recipient not active");
        require(_amount > 0, "Invalid amount");
        
        // Transfer from sender to recipient
        payable(_to).transfer(_amount);
        
        emit AgentPaid(msg.sender, _to, _amount, _reason);
    }
    
    // ============ Reputation System ============
    
    function updateReputation(address _agent, int256 _change) public onlyOwner {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        
        if (_change > 0) {
            agents[_agent].reputation += uint256(_change);
            if (agents[_agent].reputation > 10000) {
                agents[_agent].reputation = 10000;
            }
        } else {
            uint256 decrease = uint256(-_change);
            if (decrease >= agents[_agent].reputation) {
                agents[_agent].reputation = 0;
            } else {
                agents[_agent].reputation -= decrease;
            }
        }
        
        emit ReputationUpdated(_agent, agents[_agent].reputation);
    }
    
    function recordTaskCompletion(address _agent) external onlyOwner {
        require(agents[_agent].agentAddress != address(0), "Agent not registered");
        agents[_agent].totalTasksCompleted++;
        
        // Boost reputation on successful completion
        updateReputation(_agent, 100);
    }
    
    // ============ View Functions ============
    
    function getTaskBids(uint256 _taskId) external view returns (uint256[] memory) {
        return taskBids[_taskId];
    }
    
    function getAgentBids(address _agent) external view returns (uint256[] memory) {
        return agentBids[_agent];
    }
    
    function getBidDetails(uint256 _bidId) external view returns (
        uint256 taskId,
        address bidder,
        uint256 proposedPrice,
        uint256 estimatedTime,
        string memory proposal,
        BidStatus status,
        uint256 createdAt
    ) {
        Bid memory bid = bids[_bidId];
        return (
            bid.taskId,
            bid.bidder,
            bid.proposedPrice,
            bid.estimatedTime,
            bid.proposal,
            bid.status,
            bid.createdAt
        );
    }
    
    function getAgentProfile(address _agent) external view returns (
        string memory name,
        string memory capabilities,
        uint256 reputation,
        uint256 totalBidsWon,
        uint256 totalTasksCompleted,
        bool isActive
    ) {
        AgentProfile memory agent = agents[_agent];
        return (
            agent.name,
            agent.capabilities,
            agent.reputation,
            agent.totalBidsWon,
            agent.totalTasksCompleted,
            agent.isActive
        );
    }
    
    function getNegotiationDetails(uint256 _negotiationId) external view returns (
        uint256 taskId,
        address initiator,
        address counterparty,
        uint256 initiatorOffer,
        uint256 counterpartyOffer,
        NegotiationStatus status
    ) {
        Negotiation memory neg = negotiations[_negotiationId];
        return (
            neg.taskId,
            neg.initiator,
            neg.counterparty,
            neg.initiatorOffer,
            neg.counterpartyOffer,
            neg.status
        );
    }
    
    // Receive ETH
    receive() external payable {}
}
