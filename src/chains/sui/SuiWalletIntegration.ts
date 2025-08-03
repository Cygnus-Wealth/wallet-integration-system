import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  WalletIntegration, 
  WalletConnection, 
  WalletBalance,
  TokenInfo,
  Account
} from '../../types';
import { CHAIN_CONFIGS } from '../../utils/constants';
import { createAssetFromToken, createWalletBalance } from '../../utils/mappers';

interface SuietProvider {
  hasPermissions(permissions: string[]): Promise<boolean>;
  requestPermissions(permissions?: string[]): Promise<boolean>;
  getAccounts(): Promise<string[]>;
  connect(permissions?: string[]): Promise<void>;
  disconnect(): Promise<void>;
  signAndExecuteTransactionBlock(transaction: any): Promise<any>;
  on(event: string, callback: (args: any) => void): void;
  off(event: string, callback: (args: any) => void): void;
}

declare global {
  interface Window {
    suiet?: SuietProvider;
  }
}

export class SuiWalletIntegration implements WalletIntegration {
  private client: SuiClient;
  private provider: SuietProvider | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  
  constructor(
    public chain: Chain = Chain.SUI,
    public source: IntegrationSource
  ) {
    const config = CHAIN_CONFIGS[Chain.SUI];
    this.client = new SuiClient({ url: config?.rpcUrl || getFullnodeUrl('mainnet') });
  }

  async connect(): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !window.suiet) {
      throw new Error('Suiet wallet not found');
    }

    try {
      this.provider = window.suiet;
      
      const hasPermission = await this.provider.hasPermissions(['viewAccount']);
      
      if (!hasPermission) {
        await this.provider.requestPermissions();
      }
      
      const addresses = await this.provider.getAccounts();
      
      if (addresses.length === 0) {
        throw new Error('No accounts found');
      }

      // Create Account objects for all addresses
      // Note: Suiet wallet may return multiple addresses but doesn't expose
      // which wallet/mnemonic they belong to or their derivation paths
      this.accounts = addresses.map((address: string, index: number) => ({
        address,
        index,
        derivationPath: undefined, // Unknown - Suiet doesn't expose derivation paths
        label: index === 0 ? 'Active Account' : `Connected Account ${index}`
      }));

      this.activeAccountIndex = 0;
      this.connected = true;

      return {
        address: this.accounts[0].address,
        chain: this.chain,
        source: this.source,
        connected: true,
        connectedAt: new Date(),
        accounts: this.accounts,
        activeAccount: this.accounts[0]
      };
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.connected = false;
      this.provider = null;
      this.accounts = [];
      this.activeAccountIndex = 0;
    }
  }

  async getAddress(): Promise<string> {
    if (!this.connected || this.accounts.length === 0) {
      throw new Error('Wallet not connected');
    }
    return this.accounts[this.activeAccountIndex].address;
  }

  async getAllAccounts(): Promise<Account[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    
    // Try to refresh accounts from provider
    if (this.provider) {
      try {
        const addresses = await this.provider.getAccounts();
        
        // Update accounts if changed
        if (addresses.length !== this.accounts.length) {
          this.accounts = addresses.map((address: string, index: number) => ({
            address,
            index,
            derivationPath: `m/44'/784'/${index}'/0'/0'`,
            label: `Account ${index + 1}`
          }));
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    }
    
    return [...this.accounts];
  }

  async switchAccount(address: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const accountIndex = this.accounts.findIndex(
      acc => acc.address === address
    );

    if (accountIndex === -1) {
      throw new Error(`Account ${address} not found`);
    }

    this.activeAccountIndex = accountIndex;
    
    // Note: Suiet wallet may not support programmatic account switching
    // The user would need to switch accounts in the wallet extension
  }

  async getActiveAccount(): Promise<Account | null> {
    if (!this.connected || this.accounts.length === 0) {
      return null;
    }
    return this.accounts[this.activeAccountIndex];
  }

  async getBalances(): Promise<WalletBalance[]> {
    const activeAccount = await this.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account');
    }
    return this.getBalancesForAccount(activeAccount.address);
  }

  async getBalancesForAccount(address: string): Promise<WalletBalance[]> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const balances: WalletBalance[] = [];

    const suiBalance = await this.getSUIBalance(address);
    if (suiBalance) {
      balances.push(suiBalance);
    }

    const coinBalances = await this.getCoinBalances(address);
    balances.push(...coinBalances);

    return balances;
  }

  isConnected(): boolean {
    return this.connected && this.accounts.length > 0;
  }

  private async getSUIBalance(address: string): Promise<WalletBalance | null> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });

      const suiToken: TokenInfo = {
        address: '0x2::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        decimals: 9,
        chain: Chain.SUI
      };

      const asset = createAssetFromToken(suiToken);
      const formattedAmount = (parseInt(balance.totalBalance) / 1e9).toString();

      return createWalletBalance(
        asset,
        formattedAmount,
        address,
        Chain.SUI
      );
    } catch (error) {
      console.error('Error fetching SUI balance:', error);
      return null;
    }
  }

  private async getCoinBalances(address: string): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];

    try {
      const allBalances = await this.client.getAllBalances({ owner: address });

      for (const balance of allBalances) {
        if (balance.coinType === '0x2::sui::SUI') {
          continue; // Skip SUI as we handle it separately
        }

        const coinMetadata = await this.client.getCoinMetadata({
          coinType: balance.coinType
        });

        if (coinMetadata) {
          const tokenInfo: TokenInfo = {
            address: balance.coinType,
            symbol: coinMetadata.symbol,
            name: coinMetadata.name,
            decimals: coinMetadata.decimals,
            chain: Chain.SUI,
            logoURI: coinMetadata.iconUrl || undefined
          };

          const asset = createAssetFromToken(tokenInfo);
          const formattedAmount = (
            parseInt(balance.totalBalance) / Math.pow(10, coinMetadata.decimals)
          ).toString();

          const walletBalance = createWalletBalance(
            asset,
            formattedAmount,
            address,
            Chain.SUI
          );

          balances.push(walletBalance);
        }
      }
    } catch (error) {
      console.error('Error fetching coin balances:', error);
    }

    return balances;
  }
}