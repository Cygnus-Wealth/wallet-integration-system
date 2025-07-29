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
}