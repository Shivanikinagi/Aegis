/**
 * React Hooks for Wallet Connection
 */

import { useState, useEffect } from 'react';
import { walletManager, WalletState } from './wallet';

/**
 * Hook to use wallet connection
 */
export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>(
    walletManager.getState()
  );
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Subscribe to wallet state changes
    const unsubscribe = walletManager.subscribe(setWalletState);
    
    // Update balance periodically
    const intervalId = setInterval(() => {
      if (walletState.isConnected) {
        walletManager.updateBalance();
      }
    }, 10000); // Every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [walletState.isConnected]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      await walletManager.connect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    walletManager.disconnect();
  };

  const switchToMonad = async () => {
    await walletManager.switchToMonad();
  };

  return {
    ...walletState,
    isConnecting,
    connect,
    disconnect,
    switchToMonad,
    walletManager,
  };
}

/**
 * Hook for creating tasks
 */
export function useCreateTask() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (
    taskRegistryAddress: string,
    taskType: number,
    description: string,
    reward: string,
    duration: number
  ) => {
    setIsCreating(true);
    setError(null);

    try {
      const txHash = await walletManager.createTask(
        taskRegistryAddress,
        taskType,
        description,
        reward,
        duration
      );
      return txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return { createTask, isCreating, error };
}

/**
 * Hook for worker registration
 */
export function useWorkerRegistration() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerAsWorker = async (
    workerRegistryAddress: string,
    metadata: string
  ) => {
    setIsRegistering(true);
    setError(null);

    try {
      const txHash = await walletManager.registerAsWorker(
        workerRegistryAddress,
        metadata
      );
      return txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsRegistering(false);
    }
  };

  return { registerAsWorker, isRegistering, error };
}

/**
 * Hook for agent marketplace bidding
 */
export function useAgentBidding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBid = async (
    marketplaceAddress: string,
    taskId: number,
    proposedPrice: string,
    estimatedTime: number,
    proposal: string
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const txHash = await walletManager.submitBid(
        marketplaceAddress,
        taskId,
        proposedPrice,
        estimatedTime,
        proposal
      );
      return txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitBid, isSubmitting, error };
}

/**
 * Hook for token operations
 */
export function useTokenOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stakeTokens = async (tokenAddress: string, amount: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const txHash = await walletManager.stakeTokens(tokenAddress, amount);
      return txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const buyTokens = async (tokenAddress: string, amount: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const txHash = await walletManager.buyTokens(tokenAddress, amount);
      return txHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { stakeTokens, buyTokens, isProcessing, error };
}
