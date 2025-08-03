import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  ParsedAccountData
} from '@solana/web3.js';
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

interface PhantomProvider {
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  publicKey?: PublicKey;
  isConnected: boolean;
  on(event: string, callback: (args: any) => void): void;
  off(event: string, callback: (args: any) => void): void;
  request?(params: { method: string; params?: any }): Promise<any>;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export class SolanaWalletIntegration implements WalletIntegration {
  private connection: Connection;
  private provider: PhantomProvider | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  
  constructor(
    public chain: Chain = Chain.SOLANA,
    public source: IntegrationSource = IntegrationSource.PHANTOM
  ) {
    const config = CHAIN_CONFIGS[Chain.SOLANA];
    this.connection = new Connection(config?.rpcUrl || 'https://api.mainnet-beta.solana.com');
  }

  async connect(): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !window.solana) {
      throw new Error('Phantom wallet not found');
    }

    try {
      this.provider = window.solana;
      
      const response = await this.provider.connect();
      const publicKey = response.publicKey;
      
      // Create account for the connected wallet
      // Note: Phantom typically only exposes one account at a time
      this.accounts = [{
        address: publicKey.toString(),
        index: 0,
        derivationPath: undefined, // Unknown - Phantom doesn't expose derivation paths
        label: 'Active Account'
      }];

      // Try to get multiple accounts if supported
      if (this.provider.request) {
        try {
          const accountsResp = await this.provider.request({
            method: 'getAccounts'
          });
          
          if (Array.isArray(accountsResp) && accountsResp.length > 1) {
            this.accounts = accountsResp.map((acc: any, index: number) => ({
              address: typeof acc === 'string' ? acc : (acc.publicKey || acc.address),
              index,
              derivationPath: undefined, // Unknown - wallets don't expose derivation paths
              label: index === 0 ? 'Active Account' : `Connected Account ${index}`
            }));
          }
        } catch {
          // Provider doesn't support multiple accounts
        }
      }

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
    
    // Try to refresh accounts if provider supports it
    if (this.provider?.request) {
      try {
        const accountsResp = await this.provider.request({
          method: 'getAccounts'
        });
        
        if (Array.isArray(accountsResp) && accountsResp.length > 0) {
          this.accounts = accountsResp.map((acc: any, index: number) => ({
            address: typeof acc === 'string' ? acc : (acc.publicKey || acc.address),
            index,
            derivationPath: `m/44'/501'/${index}'/0'`,
            label: `Account ${index + 1}`
          }));
        }
      } catch {
        // Keep existing accounts
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
    
    // Try to switch account in provider if supported
    if (this.provider?.request) {
      try {
        await this.provider.request({
          method: 'switchAccount',
          params: { address }
        });
      } catch {
        // Provider doesn't support account switching
      }
    }
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

    const solBalance = await this.getSOLBalance(address);
    if (solBalance) {
      balances.push(solBalance);
    }

    const tokenBalances = await this.getSPLTokenBalances(address);
    balances.push(...tokenBalances);

    return balances;
  }

  isConnected(): boolean {
    return this.connected && !!this.provider?.isConnected;
  }

  private async getSOLBalance(address: string): Promise<WalletBalance | null> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      
      const solToken: TokenInfo = {
        address: 'So11111111111111111111111111111111111111112', // Native SOL mint
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        chain: Chain.SOLANA
      };

      const asset = createAssetFromToken(solToken);
      const formattedAmount = (balance / LAMPORTS_PER_SOL).toString();

      return createWalletBalance(
        asset,
        formattedAmount,
        address,
        Chain.SOLANA
      );
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return null;
    }
  }

  private async getSPLTokenBalances(address: string): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];

    try {
      const publicKey = new PublicKey(address);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      for (const { account } of tokenAccounts.value) {
        const parsedData = account.data as ParsedAccountData;
        const tokenData = parsedData.parsed.info;
        
        if (tokenData.tokenAmount.uiAmount > 0) {
          const mintAddress = tokenData.mint;
          
          const tokenInfo: TokenInfo = {
            address: mintAddress,
            symbol: mintAddress.slice(0, 6), // Will be updated with metadata
            name: mintAddress.slice(0, 6),
            decimals: tokenData.tokenAmount.decimals,
            chain: Chain.SOLANA
          };

          const asset = createAssetFromToken(tokenInfo);
          const balance = createWalletBalance(
            asset,
            tokenData.tokenAmount.uiAmountString || tokenData.tokenAmount.uiAmount.toString(),
            address,
            Chain.SOLANA
          );

          balances.push(balance);
        }
      }
    } catch (error) {
      console.error('Error fetching SPL token balances:', error);
    }

    return balances;
  }

  async getTokenMetadata(mintAddress: string): Promise<Partial<TokenInfo> | null> {
    try {
      return {
        address: mintAddress,
        symbol: mintAddress.slice(0, 6),
        name: mintAddress,
        chain: Chain.SOLANA
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }
}