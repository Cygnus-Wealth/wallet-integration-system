import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';

/**
 * Network environment for selecting chain presets.
 * TODO: Replace with NetworkEnvironment from @cygnus-wealth/data-models when da-2dd lands.
 */
export enum NetworkEnvironment {
  PRODUCTION = 'production',
  TESTNET = 'testnet',
  LOCAL = 'local'
}

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



export interface WalletIntegration {
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  isConnected(): boolean;
  chain: Chain;
  source: IntegrationSource;
  // Multi-account support methods
  getAllAccounts(): Promise<Account[]>;
  switchAccount(address: string): Promise<void>;
  getActiveAccount(): Promise<Account | null>;
}

export interface MultiChainWalletManager {
  connectWallet(chain: Chain, source: IntegrationSource): Promise<WalletConnection>;
  disconnectWallet(chain: Chain): Promise<void>;
  getConnectedWallets(): WalletConnection[];
  // Multi-wallet management methods
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


export interface WalletIntegrationConfig {
  rpcUrl?: string;
  environment?: NetworkEnvironment;
}