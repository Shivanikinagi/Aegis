/**
 * Wallet Connection Button Component
 */

import { Wallet, Power, AlertCircle } from 'lucide-react';
import { useWallet } from '../lib/walletHooks';

export function WalletButton() {
  const { 
    isConnected, 
    address, 
    balance, 
    chainId, 
    isConnecting,
    connect, 
    disconnect,
    switchToMonad 
  } = useWallet();

  const MONAD_CHAIN_ID = 10143;
  const isWrongNetwork = isConnected && chainId !== MONAD_CHAIN_ID;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | null) => {
    if (!bal) return '0.00';
    const num = parseFloat(bal);
    return num.toFixed(4);
  };

  if (isConnecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        <span>Connecting...</span>
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={switchToMonad}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
      >
        <AlertCircle size={18} />
        <span>Switch to Monad</span>
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end text-sm">
          <span className="text-gray-300 font-mono">{formatAddress(address)}</span>
          <span className="text-gray-400">{formatBalance(balance)} MON</span>
        </div>
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Disconnect Wallet"
        >
          <Power size={18} />
          <span>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      <Wallet size={18} />
      <span>Connect Wallet</span>
    </button>
  );
}

/**
 * Compact wallet status indicator
 */
export function WalletStatus() {
  const { isConnected, address, balance } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>Not Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="font-mono">
        {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
      </span>
      <span className="text-gray-400">|</span>
      <span>{balance ? parseFloat(balance).toFixed(4) : '0.00'} MON</span>
    </div>
  );
}

/**
 * Network indicator
 */
export function NetworkIndicator() {
  const { chainId, isConnected } = useWallet();
  
  if (!isConnected) return null;

  const MONAD_CHAIN_ID = 10143;
  const isMonad = chainId === MONAD_CHAIN_ID;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      isMonad 
        ? 'bg-green-900/30 text-green-400 border border-green-700' 
        : 'bg-orange-900/30 text-orange-400 border border-orange-700'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isMonad ? 'bg-green-500' : 'bg-orange-500'}`} />
      <span>{isMonad ? 'Monad Testnet' : `Chain ${chainId}`}</span>
    </div>
  );
}
