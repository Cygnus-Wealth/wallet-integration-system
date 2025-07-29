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
  TokenInfo 
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
      this.connected = true;

      return {
        address: response.publicKey.toString(),
        chain: this.chain,
        source: this.source,
        connected: true,
        connectedAt: new Date()
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
    }
  }

  async getAddress(): Promise<string> {
    if (!this.provider || !this.provider.publicKey) {
      throw new Error('Wallet not connected');
    }
    return this.provider.publicKey.toString();
  }

  async getBalances(): Promise<WalletBalance[]> {
    if (!this.provider || !this.provider.publicKey) {
      throw new Error('Wallet not connected');
    }

    const address = this.provider.publicKey.toString();
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