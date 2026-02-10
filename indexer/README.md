# Envio Indexer Setup

This directory contains the Envio indexer configuration for the Autonomous Treasury Agent system.

## What is Envio?

Envio is a high-performance blockchain indexer that provides:
- Real-time event indexing
- GraphQL API for queries
- Automatic database management
- Multi-chain support
- Custom aggregations

## Prerequisites

1. Node.js 18+ and npm
2. PostgreSQL database
3. Deployed contracts on Monad testnet

## Installation

```bash
# Install Envio CLI globally
npm install -g envio

# Initialize your indexer
envio init

# Install dependencies
npm install
```

## Configuration

1. **Update envio.yaml** with your deployed contract addresses:
   ```yaml
   - name: Treasury
     address: ["0xYourTreasuryAddress"]
   ```

2. **Set environment variables**:
   ```bash
   export POSTGRES_PASSWORD=your_password
   export ENVIO_RPC_URL=https://testnet-rpc.monad.xyz
   ```

3. **Update start_block** in envio.yaml with your deployment block number

## Running the Indexer

### Local Development

```bash
# Start PostgreSQL (if not running)
docker run -d \
  --name treasury-postgres \
  -e POSTGRES_PASSWORD=indexer \
  -e POSTGRES_DB=treasury_indexer \
  -e POSTGRES_USER=indexer \
  -p 5432:5432 \
  postgres:15

# Start the indexer
envio dev
```

### Production

```bash
# Build the indexer
envio codegen

# Start indexing
envio start

# Access GraphQL API at http://localhost:8080/graphql
```

## Querying the Indexer

### GraphQL Playground

Open http://localhost:8080/graphql in your browser

### Example Queries

**Get recent tasks:**
```graphql
query {
  tasks(limit: 10, orderBy: createdAt, orderDirection: desc) {
    id
    taskId
    creator
    reward
    status
    assignedWorker
  }
}
```

**Get worker statistics:**
```graphql
query {
  workers(where: { isActive: true }) {
    address
    reliabilityScore
    totalTasks
    completedTasks
  }
}
```

**Get agent bids:**
```graphql
query {
  bids(where: { status: "Active" }) {
    bidId
    taskId
    bidder
    proposedPrice
    proposal
  }
}
```

### From Python

Use the `indexer.py` module:

```python
from agent.indexer import get_indexer

indexer = get_indexer()

# Get tasks
tasks = indexer.get_tasks(limit=10)

# Get workers
workers = indexer.get_workers(active_only=True)

# Get statistics
stats = indexer.get_statistics()
```

## Monitoring

```bash
# Check indexer status
envio status

# View logs
envio logs

# Reset database (WARNING: deletes all data)
envio reset
```

## Deployment

### Hosted Indexer (Recommended for Production)

Envio offers hosted indexing service:

1. Sign up at https://envio.dev
2. Upload your configuration
3. Connect to hosted GraphQL endpoint
4. Update `ENVIO_API_URL` in your .env

### Self-Hosted

Use Docker Compose:

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f indexer
```

## Schema

The indexer tracks:

- **Tasks**: All task lifecycle events
- **Workers**: Worker registration and performance
- **Agents**: Marketplace agents and reputation
- **Bids**: Agent bidding and negotiation
- **Tokens**: Token transfers, staking, governance
- **Treasury**: Balance and payment events

## Performance

Expected performance:
- **Sync speed**: ~1000 blocks/second
- **Query latency**: <50ms
- **Real-time lag**: <1 second

## Troubleshooting

**Indexer not syncing:**
- Check RPC URL is accessible
- Verify contract addresses are correct
- Check start_block is valid

**Database errors:**
- Ensure PostgreSQL is running
- Check connection credentials
- Try `envio reset` (WARNING: deletes data)

**Missing events:**
- Verify ABI includes all events
- Check contract addresses
- Review indexer logs

## Resources

- [Envio Documentation](https://docs.envio.dev)
- [GraphQL Tutorial](https://graphql.org/learn)
- [Monad Testnet Explorer](https://testnet.monadvision.com)
