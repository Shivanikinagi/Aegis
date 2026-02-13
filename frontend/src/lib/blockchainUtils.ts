import { ethers } from 'ethers';

const TREASURY_ABI = [
  "function getBalance() view returns (uint256 total, uint256 available, uint256 reserved)",
  "function getDailySpending() view returns (uint256 spent, uint256 remaining)",
  "function deposit() payable",
];

const TASK_REGISTRY_ABI = [
  "function getTask(uint256 taskId) view returns (tuple(uint8 taskType, uint8 status, address creator, address assignedWorker, uint256 maxPayment, uint256 actualPayment, uint256 deadline, uint256 createdAt, uint256 completedAt, string verificationRule))",
  "function taskCount() view returns (uint256)",
];

const WORKER_REGISTRY_ABI = [
  "function getWorker(address worker) view returns (tuple(bool isActive, uint256 registeredAt, uint256 totalTasks, uint256 successfulTasks, uint256 totalEarnings, uint256 reliabilityScore, uint8[] allowedTaskTypes))",
  "function getActiveWorkers() view returns (address[])",
];

let deploymentAddresses: any = null;

async function loadDeploymentAddresses() {
  if (deploymentAddresses) return deploymentAddresses;

  try {
    const response = await fetch('/contracts/deployments/localhost.json');
    deploymentAddresses = await response.json();
    return deploymentAddresses;
  } catch (error) {
    console.error('Failed to load deployment addresses:', error);
    return null;
  }
}

export async function getProvider() {
  return new ethers.JsonRpcProvider('http://127.0.0.1:8545');
}

export async function getTreasuryContract() {
  const addresses = await loadDeploymentAddresses();
  if (!addresses) throw new Error('Deployment addresses not found');

  const provider = await getProvider();
  return new ethers.Contract(addresses.Treasury, TREASURY_ABI, provider);
}

export async function getTaskRegistryContract() {
  const addresses = await loadDeploymentAddresses();
  if (!addresses) throw new Error('Deployment addresses not found');

  const provider = await getProvider();
  return new ethers.Contract(addresses.TaskRegistry, TASK_REGISTRY_ABI, provider);
}

export async function getWorkerRegistryContract() {
  const addresses = await loadDeploymentAddresses();
  if (!addresses) throw new Error('Deployment addresses not found');

  const provider = await getProvider();
  return new ethers.Contract(addresses.WorkerRegistry, WORKER_REGISTRY_ABI, provider);
}

export async function checkConnection() {
  try {
    const provider = await getProvider();
    const blockNumber = await provider.getBlockNumber();
    return { connected: true, blockNumber };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { connected: false, blockNumber: 0 };
  }
}

export async function getTreasuryData() {
  try {
    const contract = await getTreasuryContract();
    const addresses = await loadDeploymentAddresses();

    const balance = await contract.getBalance();
    const daily = await contract.getDailySpending();

    return {
      balance: {
        total: Number(ethers.formatEther(balance.total)),
        available: Number(ethers.formatEther(balance.available)),
        reserved: Number(ethers.formatEther(balance.reserved))
      },
      daily: {
        spent: Number(ethers.formatEther(daily.spent)),
        remaining: Number(ethers.formatEther(daily.remaining))
      },
      address: addresses?.Treasury
    };
  } catch (error) {
    console.error('Error fetching treasury data:', error);
    return null;
  }
}

export async function getTasks() {
  try {
    const contract = await getTaskRegistryContract();
    const count = await contract.taskCount();
    const tasks = [];

    for (let i = 0; i < Number(count); i++) {
      const task = await contract.getTask(i);
      tasks.push({
        id: i,
        taskType: ['DATA_ANALYSIS', 'MODEL_TRAINING', 'RESEARCH', 'VALIDATION', 'OPTIMIZATION'][Number(task.taskType)] || 'UNKNOWN',
        status: ['CREATED', 'ASSIGNED', 'SUBMITTED', 'COMPLETED', 'FAILED', 'CANCELLED'][Number(task.status)] || 'UNKNOWN',
        creator: task.creator,
        assignedWorker: task.assignedWorker === ethers.ZeroAddress ? null : task.assignedWorker,
        maxPayment: Number(ethers.formatEther(task.maxPayment)),
        actualPayment: Number(ethers.formatEther(task.actualPayment)),
        deadline: Number(task.deadline),
        createdAt: Number(task.createdAt),
        completedAt: Number(task.completedAt),
        verificationRule: task.verificationRule
      });
    }

    const openCount = tasks.filter(t => t.status === 'CREATED' || t.status === 'ASSIGNED').length;

    return { tasks, total: tasks.length, openCount };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { tasks: [], total: 0, openCount: 0 };
  }
}

export async function getWorkers() {
  try {
    const contract = await getWorkerRegistryContract();
    const addresses = await contract.getActiveWorkers();
    const workers = [];

    for (const addr of addresses) {
      const worker = await contract.getWorker(addr);
      const successRate = Number(worker.totalTasks) > 0
        ? Number(worker.successfulTasks) / Number(worker.totalTasks)
        : 0;

      workers.push({
        address: addr,
        isActive: worker.isActive,
        registeredAt: Number(worker.registeredAt),
        totalTasks: Number(worker.totalTasks),
        successfulTasks: Number(worker.successfulTasks),
        totalEarnings: Number(ethers.formatEther(worker.totalEarnings)),
        reliabilityScore: Number(worker.reliabilityScore),
        successRate,
        allowedTaskTypes: worker.allowedTaskTypes.map((t: any) => Number(t))
      });
    }

    return { workers };
  } catch (error) {
    console.error('Error fetching workers:', error);
    return { workers: [] };
  }
}

export function formatMON(value: number, decimals: number = 4): string {
  return `${value.toFixed(decimals)} MON`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '—';
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getExplorerLink(addressOrHash: string, type: 'address' | 'tx' = 'address'): string {
  const baseUrl = 'https://testnet.monadvision.com';
  return `${baseUrl}/${type}/${addressOrHash}`;
}
