import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { v4 as uuidv4 } from 'uuid';
import { 
  MultiChainWalletManager, 
  WalletConnection, 
  WalletIntegration,
  WalletInstance,
  Account,
  WalletIntegrationConfig
} from '../types';
import { EVMWalletIntegration } from '../chains/evm/EVMWalletIntegration';
import { SolanaWalletIntegration } from '../chains/solana/SolanaWalletIntegration';
import { SuiWalletIntegration } from '../chains/sui/SuiWalletIntegration';
import { EVM_CHAINS } from '../utils/constants';

interface WalletData {
  instance: WalletInstance;
  integrations: Map<Chain, WalletIntegration>;
  connections: Map<Chain, WalletConnection>;
}

export class WalletManager implements MultiChainWalletManager {
  private wallets: Map<string, WalletData> = new Map();
  private activeWalletId: string | null = null;
  private config?: WalletIntegrationConfig;

  constructor(config?: WalletIntegrationConfig) {
    this.config = config;
  }

  async connectWallet(
    chain: Chain, 
    source: IntegrationSource
  ): Promise<WalletConnection> {
    // Get or create active wallet
    if (!this.activeWalletId) {
      const newWallet = await this.addWallet();
      this.activeWalletId = newWallet.id;
    }

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) {
      throw new Error('No active wallet');
    }

    let integration = walletData.integrations.get(chain);

    if (!integration) {
      integration = this.createWalletIntegration(chain, source);
      walletData.integrations.set(chain, integration);
    }

    const connection = await integration.connect();
    walletData.connections.set(chain, connection);

    // Update wallet instance with accounts from this chain
    if (connection.accounts) {
      // Merge accounts, avoiding duplicates
      const existingAddresses = new Set(walletData.instance.accounts.map(a => a.address));
      const newAccounts = connection.accounts.filter(a => !existingAddresses.has(a.address));
      walletData.instance.accounts.push(...newAccounts);
    }
    
    return connection;
  }

  async disconnectWallet(chain: Chain): Promise<void> {
    if (!this.activeWalletId) return;

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) return;

    const integration = walletData.integrations.get(chain);
    
    if (integration) {
      await integration.disconnect();
      walletData.integrations.delete(chain);
      walletData.connections.delete(chain);
    }
  }

  getConnectedWallets(): WalletConnection[] {
    if (!this.activeWalletId) return [];

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) return [];

    return Array.from(walletData.connections.values());
  }

  // Multi-wallet management methods
  getAllWallets(): WalletInstance[] {
    return Array.from(this.wallets.values()).map(data => data.instance);
  }

  getWallet(walletId: string): WalletInstance | undefined {
    return this.wallets.get(walletId)?.instance;
  }

  async switchWallet(walletId: string): Promise<void> {
    if (!this.wallets.has(walletId)) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    this.activeWalletId = walletId;
  }

  async addWallet(name?: string): Promise<WalletInstance> {
    const walletId = uuidv4();
    const instance: WalletInstance = {
      id: walletId,
      name: name || `Wallet ${this.wallets.size + 1}`,
      accounts: [],
      activeAccountIndex: 0,
      source: IntegrationSource.METAMASK // Default, will be updated on first connection
    };

    const walletData: WalletData = {
      instance,
      integrations: new Map(),
      connections: new Map()
    };

    this.wallets.set(walletId, walletData);
    this.activeWalletId = walletId;

    return instance;
  }

  async removeWallet(walletId: string): Promise<void> {
    const walletData = this.wallets.get(walletId);
    if (!walletData) return;

    // Disconnect all integrations
    for (const integration of walletData.integrations.values()) {
      if (integration.isConnected()) {
        await integration.disconnect();
      }
    }

    this.wallets.delete(walletId);

    // If this was the active wallet, switch to another
    if (this.activeWalletId === walletId) {
      const remainingWallets = Array.from(this.wallets.keys());
      this.activeWalletId = remainingWallets.length > 0 ? remainingWallets[0] : null;
    }
  }

  // Multi-account methods
  async getAllAccountsForChain(chain: Chain): Promise<Account[]> {
    if (!this.activeWalletId) return [];

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) return [];

    const integration = walletData.integrations.get(chain);
    if (!integration || !integration.isConnected()) {
      return [];
    }

    return integration.getAllAccounts();
  }

  async switchAccountForChain(chain: Chain, address: string): Promise<void> {
    if (!this.activeWalletId) {
      throw new Error('No active wallet');
    }

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) {
      throw new Error('Wallet not found');
    }

    const integration = walletData.integrations.get(chain);
    if (!integration || !integration.isConnected()) {
      throw new Error(`Chain ${chain} not connected`);
    }

    await integration.switchAccount(address);

    // Update active account index in wallet instance
    const accountIndex = walletData.instance.accounts.findIndex(
      acc => acc.address.toLowerCase() === address.toLowerCase()
    );
    if (accountIndex !== -1) {
      walletData.instance.activeAccountIndex = accountIndex;
    }
  }

  private createWalletIntegration(
    chain: Chain, 
    source: IntegrationSource
  ): WalletIntegration {
    if (EVM_CHAINS.includes(chain)) {
      return new EVMWalletIntegration(chain, source, this.config);
    }
    
    switch (chain) {
      case Chain.SOLANA:
        return new SolanaWalletIntegration(chain, source, this.config);
      case Chain.SUI:
        return new SuiWalletIntegration(chain, source, this.config);
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const walletData of this.wallets.values()) {
      for (const [chain, integration] of walletData.integrations) {
        if (integration.isConnected()) {
          disconnectPromises.push(
            integration.disconnect().catch(error => 
              console.error(`Error disconnecting ${chain}:`, error)
            )
          );
        }
      }
    }
    
    await Promise.all(disconnectPromises);
  }

  isWalletConnected(chain: Chain): boolean {
    if (!this.activeWalletId) return false;

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) return false;

    const integration = walletData.integrations.get(chain);
    return integration ? integration.isConnected() : false;
  }

  getWalletAddress(chain: Chain): string | null {
    if (!this.activeWalletId) return null;

    const walletData = this.wallets.get(this.activeWalletId);
    if (!walletData) return null;

    const connection = walletData.connections.get(chain);
    return connection ? connection.address : null;
  }

  /**
   * Connects to all EVM chains available in the wallet.
   * This uses the same address across all EVM chains.
   */
  async connectAllEVMChains(source: IntegrationSource = IntegrationSource.METAMASK): Promise<{
    connections: WalletConnection[];
  }> {
    const connections: WalletConnection[] = [];
    
    // First connect to one chain to get the address
    const firstChain = EVM_CHAINS[0];
    const firstConnection = await this.connectWallet(firstChain, source);
    connections.push(firstConnection);
    
    // Connect to remaining chains in parallel
    const remainingChains = EVM_CHAINS.slice(1);
    const connectionPromises = remainingChains.map(chain => 
      this.connectWallet(chain, source).catch(error => {
        console.error(`Error connecting to ${chain}:`, error);
        return null;
      })
    );
    
    const remainingConnections = await Promise.all(connectionPromises);
    connections.push(...remainingConnections.filter(conn => conn !== null) as WalletConnection[]);
    
    return { connections };
  }

  /**
   * Get all accounts across all connected chains and wallets
   */
  async getAllAccounts(): Promise<{
    [walletId: string]: {
      wallet: WalletInstance;
      accountsByChain: {
        [chain: string]: Account[];
      }
    }
  }> {
    const results: any = {};

    for (const [walletId, walletData] of this.wallets) {
      const walletResult: any = {
        wallet: walletData.instance,
        accountsByChain: {}
      };

      for (const [chain, integration] of walletData.integrations) {
        if (integration.isConnected()) {
          try {
            const accounts = await integration.getAllAccounts();
            walletResult.accountsByChain[chain] = accounts;
          } catch (error) {
            console.error(`Error fetching accounts for ${chain}:`, error);
            walletResult.accountsByChain[chain] = [];
          }
        }
      }

      results[walletId] = walletResult;
    }

    return results;
  }
}