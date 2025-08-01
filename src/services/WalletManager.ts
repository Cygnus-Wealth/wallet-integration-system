import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  MultiChainWalletManager, 
  WalletConnection, 
  WalletBalance,
  WalletIntegration 
} from '../types';
import { EVMWalletIntegration } from '../chains/evm/EVMWalletIntegration';
import { SolanaWalletIntegration } from '../chains/solana/SolanaWalletIntegration';
import { SuiWalletIntegration } from '../chains/sui/SuiWalletIntegration';
import { EVM_CHAINS } from '../utils/constants';

export class WalletManager implements MultiChainWalletManager {
  private wallets: Map<Chain, WalletIntegration> = new Map();
  private connections: Map<Chain, WalletConnection> = new Map();

  async connectWallet(
    chain: Chain, 
    source: IntegrationSource
  ): Promise<WalletConnection> {
    let wallet = this.wallets.get(chain);

    if (!wallet) {
      wallet = this.createWalletIntegration(chain, source);
      this.wallets.set(chain, wallet);
    }

    const connection = await wallet.connect();
    this.connections.set(chain, connection);
    
    return connection;
  }

  async disconnectWallet(chain: Chain): Promise<void> {
    const wallet = this.wallets.get(chain);
    
    if (wallet) {
      await wallet.disconnect();
      this.wallets.delete(chain);
      this.connections.delete(chain);
    }
  }

  async getAllBalances(): Promise<WalletBalance[]> {
    const allBalances: WalletBalance[] = [];
    
    for (const [chain, wallet] of this.wallets) {
      if (wallet.isConnected()) {
        try {
          const balances = await wallet.getBalances();
          allBalances.push(...balances);
        } catch (error) {
          console.error(`Error fetching balances for ${chain}:`, error);
        }
      }
    }
    
    return allBalances;
  }

  async getBalancesByChain(chain: Chain): Promise<WalletBalance[]> {
    const wallet = this.wallets.get(chain);
    
    if (!wallet || !wallet.isConnected()) {
      return [];
    }
    
    return wallet.getBalances();
  }

  getConnectedWallets(): WalletConnection[] {
    return Array.from(this.connections.values());
  }

  async refreshBalances(): Promise<void> {
    const refreshPromises = Array.from(this.wallets.entries())
      .filter(([_, wallet]) => wallet.isConnected())
      .map(([chain, wallet]) => 
        wallet.getBalances().catch(error => {
          console.error(`Error refreshing balances for ${chain}:`, error);
          return [];
        })
      );
    
    await Promise.all(refreshPromises);
  }

  private createWalletIntegration(
    chain: Chain, 
    source: IntegrationSource
  ): WalletIntegration {
    if (EVM_CHAINS.includes(chain)) {
      return new EVMWalletIntegration(chain, source);
    }
    
    switch (chain) {
      case Chain.SOLANA:
        return new SolanaWalletIntegration(chain, source);
      case Chain.SUI:
        return new SuiWalletIntegration(chain, source);
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.wallets.keys()).map(chain => 
      this.disconnectWallet(chain).catch(error => 
        console.error(`Error disconnecting ${chain}:`, error)
      )
    );
    
    await Promise.all(disconnectPromises);
  }

  isWalletConnected(chain: Chain): boolean {
    const wallet = this.wallets.get(chain);
    return wallet ? wallet.isConnected() : false;
  }

  getWalletAddress(chain: Chain): string | null {
    const connection = this.connections.get(chain);
    return connection ? connection.address : null;
  }

  /**
   * Connects to all EVM chains available in the wallet and fetches balances.
   * This uses the same address across all EVM chains.
   */
  async connectAllEVMChains(source: IntegrationSource = IntegrationSource.METAMASK): Promise<{
    connections: WalletConnection[];
    balances: WalletBalance[];
  }> {
    const connections: WalletConnection[] = [];
    const balances: WalletBalance[] = [];
    
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
    
    // Fetch balances from all connected chains
    const balancePromises = connections.map(conn => 
      this.getBalancesByChain(conn.chain).catch(error => {
        console.error(`Error fetching balances for ${conn.chain}:`, error);
        return [];
      })
    );
    
    const allBalances = await Promise.all(balancePromises);
    allBalances.forEach(chainBalances => balances.push(...chainBalances));
    
    return { connections, balances };
  }

  /**
   * Fetches balances from all supported chains without requiring individual connections.
   * For EVM chains, this connects to all chains automatically using the same address.
   */
  async getAllChainBalances(options?: {
    evmSource?: IntegrationSource;
    includeNonEVM?: boolean;
  }): Promise<{
    [chain: string]: WalletBalance[];
  }> {
    const results: { [chain: string]: WalletBalance[] } = {};
    
    // Connect and fetch from all EVM chains
    if (typeof window !== 'undefined' && window.ethereum) {
      const evmResult = await this.connectAllEVMChains(
        options?.evmSource || IntegrationSource.METAMASK
      );
      
      // Group balances by chain
      for (const balance of evmResult.balances) {
        if (!results[balance.chain]) {
          results[balance.chain] = [];
        }
        results[balance.chain].push(balance);
      }
    }
    
    // Optionally include non-EVM chains if already connected
    if (options?.includeNonEVM) {
      const nonEVMChains = [Chain.SOLANA, Chain.SUI];
      for (const chain of nonEVMChains) {
        if (this.isWalletConnected(chain)) {
          const balances = await this.getBalancesByChain(chain);
          if (balances.length > 0) {
            results[chain] = balances;
          }
        }
      }
    }
    
    return results;
  }
}