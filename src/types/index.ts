import { Balance, Chain, IntegrationSource } from '@cygnus-wealth/data-models';

export interface WalletConnection {
  address: string;
  chain: Chain;
  source: IntegrationSource;
  connected: boolean;
  connectedAt?: Date;
}

export interface WalletBalance extends Balance {
  walletAddress: string;
  chain: Chain;
  blockNumber?: number;
  lastUpdated: Date;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chain: Chain;
  logoURI?: string;
  coingeckoId?: string;
}

export interface WalletIntegration {
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  getBalances(): Promise<WalletBalance[]>;
  isConnected(): boolean;
  chain: Chain;
  source: IntegrationSource;
}

export interface MultiChainWalletManager {
  connectWallet(chain: Chain, source: IntegrationSource): Promise<WalletConnection>;
  disconnectWallet(chain: Chain): Promise<void>;
  getAllBalances(): Promise<WalletBalance[]>;
  getBalancesByChain(chain: Chain): Promise<WalletBalance[]>;
  getConnectedWallets(): WalletConnection[];
  refreshBalances(): Promise<void>;
}

export interface ChainConfig {
  chain: Chain;
  rpcUrl?: string;
  chainId: number | string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export interface TokenList {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: TokenInfo[];
}