import { Balance, Chain, IntegrationSource } from '@cygnus-wealth/data-models';

export interface Account {
  address: string;
  index: number;
  /**
   * The HD wallet derivation path for this account.
   * Note: This is typically unknown for browser wallets as they don't expose this information.
   * MetaMask returns all connected addresses across all wallets (different mnemonics,
   * hardware wallets, imported keys) without revealing their relationships.
   */
  derivationPath?: string;
  label?: string;
}

export interface WalletInstance {
  id: string;
  name?: string;
  accounts: Account[];
  activeAccountIndex: number;
  source: IntegrationSource;
}

export interface WalletConnection {
  address: string;
  chain: Chain;
  source: IntegrationSource;
  connected: boolean;
  connectedAt?: Date;
  // New fields for multi-account support
  accounts?: Account[];
  activeAccount?: Account;
  walletId?: string;
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
  // New methods for multi-account support
  getAllAccounts(): Promise<Account[]>;
  switchAccount(address: string): Promise<void>;
  getActiveAccount(): Promise<Account | null>;
  getBalancesForAccount(address: string): Promise<WalletBalance[]>;
}

export interface MultiChainWalletManager {
  connectWallet(chain: Chain, source: IntegrationSource): Promise<WalletConnection>;
  disconnectWallet(chain: Chain): Promise<void>;
  getAllBalances(): Promise<WalletBalance[]>;
  getBalancesByChain(chain: Chain): Promise<WalletBalance[]>;
  getConnectedWallets(): WalletConnection[];
  refreshBalances(): Promise<void>;
  // New methods for multi-wallet management
  getAllWallets(): WalletInstance[];
  getWallet(walletId: string): WalletInstance | undefined;
  switchWallet(walletId: string): Promise<void>;
  addWallet(name?: string): Promise<WalletInstance>;
  removeWallet(walletId: string): Promise<void>;
  // Multi-account methods across chains
  getAllAccountsForChain(chain: Chain): Promise<Account[]>;
  switchAccountForChain(chain: Chain, address: string): Promise<void>;
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

export interface WalletIntegrationConfig {
  rpcUrl?: string;
  // Future configuration options can be added here
}