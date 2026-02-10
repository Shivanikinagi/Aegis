/**
 * Wallet Connection & Management
 * Handles MetaMask and other Web3 wallet connections
 */

import { BrowserProvider, JsonRpcSigner, formatEther, parseEther } from 'ethers';
import { toast } from 'sonner';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  error: string | null;
}

class WalletManager {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private listeners: Set<(state: WalletState) => void> = new Set();
  
  private state: WalletState = {
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    error: null,
  };

  constructor() {
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask wallet
   */
  async connect(): Promise<WalletState> {
    if (!this.isMetaMaskInstalled()) {
      const error = 'MetaMask is not installed. Please install it from https://metamask.io';
      this.updateState({ error });
      toast.error(error);
      throw new Error(error);
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      
      // Request account access
      await this.provider.send('eth_requestAccounts', []);
      
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      this.updateState({
        isConnected: true,
        address,
        balance: formatEther(balance),
        chainId: Number(network.chainId),
        error: null,
      });

      toast.success('Wallet connected successfully!');
      return this.state;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to connect wallet';
      this.updateState({ error: errorMsg });
      toast.error(errorMsg);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    
    this.updateState({
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      error: null,
    });

    toast.info('Wallet disconnected');
  }

  /**
   * Switch to Monad testnet
   */
  async switchToMonad(): Promise<void> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    const monadChainId = '0x279F'; // 10143 in hex

    try {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: monadChainId }
      ]);
    } catch (error: any) {
      // Chain not added, try adding it
      if (error.code === 4902) {
        await this.addMonadNetwork();
      } else {
        throw error;
      }
    }
  }

  /**
   * Add Monad network to MetaMask
   */
  async addMonadNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      await this.provider.send('wallet_addEthereumChain', [
        {
          chainId: '0x279F', // 10143
          chainName: 'Monad Testnet',
          nativeCurrency: {
            name: 'MON',
            symbol: 'MON',
            decimals: 18,
          },
          rpcUrls: ['https://testnet-rpc.monad.xyz'],
          blockExplorerUrls: ['https://testnet.monadvision.com'],
        },
      ]);

      toast.success('Monad network added successfully!');
    } catch (error:any) {
      toast.error('Failed to add Monad network: ' + error.message);
      throw error;
    }
  }

  /**
   * Create a task on-chain
   */
  async createTask(
    taskRegistryAddress: string,
    taskType: number,
    description: string,
    reward: string,
    duration: number
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const taskRegistryABI = [
        'function createTask(uint8 taskType, string description, uint256 reward, uint256 duration) external payable returns (uint256)'
      ];

      const { Contract } = await import('ethers');
      const contract = new Contract(taskRegistryAddress, taskRegistryABI, this.signer);

      const rewardWei = parseEther(reward);
      const tx = await contract.createTask(taskType, description, rewardWei, duration, {
        value: rewardWei,
      });

      toast.info('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();
      
      toast.success('Task created successfully!');
      return receipt.hash;
    } catch (error: any) {
      toast.error('Failed to create task: ' + error.message);
      throw error;
    }
  }

  /**
   * Register as a worker on-chain
   */
  async registerAsWorker(
    workerRegistryAddress: string,
    metadata: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const workerRegistryABI = [
        'function registerWorker(string metadata) external'
      ];

      const { Contract } = await import('ethers');
      const contract = new Contract(workerRegistryAddress, workerRegistryABI, this.signer);

      const tx = await contract.registerWorker(metadata);
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();
      
      toast.success('Registered as worker successfully!');
      return receipt.hash;
    } catch (error: any) {
      toast.error('Failed to register as worker: ' + error.message);
      throw error;
    }
  }

  /**
   * Submit bid on agent marketplace
   */
  async submitBid(
    marketplaceAddress: string,
    taskId: number,
    proposedPrice: string,
    estimatedTime: number,
    proposal: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const marketplaceABI = [
        'function submitBid(uint256 taskId, uint256 proposedPrice, uint256 estimatedTime, string proposal) external returns (uint256)'
      ];

      const { Contract } = await import('ethers');
      const contract = new Contract(marketplaceAddress, marketplaceABI, this.signer);

      const priceWei = parseEther(proposedPrice);
      const tx = await contract.submitBid(taskId, priceWei, estimatedTime, proposal);
      
      toast.info('Submitting bid...');
      const receipt = await tx.wait();
      
      toast.success('Bid submitted successfully!');
      return receipt.hash;
    } catch (error: any) {
      toast.error('Failed to submit bid: ' + error.message);
      throw error;
    }
  }

  /**
   * Buy agent tokens
   */
  async buyTokens(
    tokenAddress: string,
    amount: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simplified - in production, this would interact with DEX/nad.fun
      toast.info('Token purchase flow - integrate with DEX or nad.fun');
      return '';
    } catch (error: any) {
      toast.error('Failed to buy tokens: ' + error.message);
      throw error;
    }
  }

  /**
   * Stake tokens
   */
  async stakeTokens(
    tokenAddress: string,
    amount: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenABI = [
        'function stake(uint256 amount) external'
      ];

      const { Contract, parseEther } = await import('ethers');
      const contract = new Contract(tokenAddress, tokenABI, this.signer);

      const amountWei = parseEther(amount);
      const tx = await contract.stake(amountWei);
      
      toast.info('Staking tokens...');
      const receipt = await tx.wait();
      
      toast.success('Tokens staked successfully!');
      return receipt.hash;
    } catch (error: any) {
      toast.error('Failed to stake tokens: ' + error.message);
      throw error;
    }
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Get signer for contract interactions
   */
  getSigner(): JsonRpcSigner | null {
    return this.signer;
  }

  /**
   * Get provider
   */
  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  /**
   * Subscribe to wallet state changes
   */
  subscribe(callback: (state: WalletState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Handle account changes
   */
  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      // Reconnect with new account
      await this.connect();
    }
  }

  /**
   * Handle chain changes
   */
  private handleChainChanged(): void {
    // Reload page on chain change (recommended by MetaMask)
    window.location.reload();
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.disconnect();
  }

  /**
   * Update wallet state and notify listeners
   */
  private updateState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Update balance
   */
  async updateBalance(): Promise<void> {
    if (!this.provider || !this.state.address) return;

    try {
      const balance = await this.provider.getBalance(this.state.address);
      this.updateState({ balance: formatEther(balance) });
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }
}

// Export singleton instance
export const walletManager = new WalletManager();

// TypeScript declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
