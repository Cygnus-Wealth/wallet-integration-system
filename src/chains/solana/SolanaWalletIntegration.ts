import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  AccountInfo,
  Context
} from '@solana/web3.js';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  WalletIntegration, 
  WalletConnection, 
  WalletBalance,
  TokenInfo,
  Account,
  WalletIntegrationConfig
} from '../../types';
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

// Default RPC endpoints for Solana mainnet
const DEFAULT_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com',
  'https://mainnet.helius-rpc.com/?api-key=demo'
];

interface BalanceUpdateCallback {
  (balance: WalletBalance[]): void;
}

interface ConnectionState {
  isWebSocket: boolean;
  isConnected: boolean;
  currentEndpointIndex: number;
  reconnectAttempts: number;
  lastReconnectTime?: number;
}

export class SolanaWalletIntegration implements WalletIntegration {
  private connection: Connection;
  private wsConnection: Connection | null = null;
  private httpConnection: Connection;
  private provider: PhantomProvider | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  private rpcEndpoints: string[];
  private connectionState: ConnectionState;
  private subscriptions: Map<string, number> = new Map();
  private balanceCallbacks: Map<string, BalanceUpdateCallback[]> = new Map();
  private reconnectTimer?: NodeJS.Timeout;
  private pollTimer?: NodeJS.Timeout;
  private isPolling: boolean = false;
  private lastBalances: Map<string, WalletBalance[]> = new Map();
  
  constructor(
    public chain: Chain = Chain.SOLANA,
    public source: IntegrationSource = IntegrationSource.PHANTOM,
    config?: WalletIntegrationConfig
  ) {
    // Initialize RPC endpoints, converting any ws/wss URLs to http/https
    if (config?.rpcUrl) {
      let rpcUrl = config.rpcUrl;
      // Convert WebSocket URLs to HTTP URLs for the Connection constructor
      if (rpcUrl.startsWith('wss://')) {
        rpcUrl = rpcUrl.replace('wss://', 'https://');
      } else if (rpcUrl.startsWith('ws://')) {
        rpcUrl = rpcUrl.replace('ws://', 'http://');
      }
      // If custom RPC URL provided, use it as primary with defaults as fallback
      this.rpcEndpoints = [rpcUrl, ...DEFAULT_RPC_ENDPOINTS];
    } else {
      this.rpcEndpoints = [...DEFAULT_RPC_ENDPOINTS];
    }

    // Initialize connection state
    this.connectionState = {
      isWebSocket: false,
      isConnected: false,
      currentEndpointIndex: 0,
      reconnectAttempts: 0
    };

    // Create initial HTTP connection as fallback
    this.httpConnection = new Connection(this.rpcEndpoints[0], 'confirmed');
    this.connection = this.httpConnection;

    // Attempt to establish WebSocket connection
    this.initializeWebSocketConnection();
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
    // Clean up subscriptions
    await this.cleanupSubscriptions();

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Disconnect wallet
    if (this.provider) {
      await this.provider.disconnect();
      this.connected = false;
      this.provider = null;
      this.accounts = [];
      this.activeAccountIndex = 0;
    }

    // Reset state
    this.balanceCallbacks.clear();
    this.lastBalances.clear();
    this.isPolling = false;
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

  // WebSocket connection management
  private async initializeWebSocketConnection(): Promise<void> {
    const httpUrl = this.rpcEndpoints[this.connectionState.currentEndpointIndex];
    const wsUrl = this.getWebSocketUrl(httpUrl);
    
    try {
      // Connection constructor expects HTTP/HTTPS URL, not WebSocket URL
      // It will handle WebSocket connections internally when using subscription methods
      this.wsConnection = new Connection(httpUrl, {
        commitment: 'confirmed',
        wsEndpoint: wsUrl  // Optionally provide the WebSocket endpoint
      });

      // Test the connection
      await this.wsConnection.getSlot();
      
      this.connection = this.wsConnection;
      this.connectionState.isWebSocket = true;
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;

      console.log(`Connected to RPC: ${httpUrl} (WebSocket: ${wsUrl})`);

      // Set up connection monitoring
      this.monitorConnection();
    } catch (error) {
      console.warn(`Failed to connect to ${httpUrl}:`, error);
      await this.handleConnectionFailure();
    }
  }

  private getWebSocketUrl(httpUrl: string): string {
    // Convert HTTP URL to WebSocket URL
    return httpUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
  }

  private async handleConnectionFailure(): Promise<void> {
    this.connectionState.isConnected = false;
    this.connectionState.reconnectAttempts++;

    // Try next endpoint
    this.connectionState.currentEndpointIndex = 
      (this.connectionState.currentEndpointIndex + 1) % this.rpcEndpoints.length;

    // Calculate backoff delay (exponential with max of 30 seconds)
    const backoffDelay = Math.min(
      1000 * Math.pow(2, this.connectionState.reconnectAttempts - 1),
      30000
    );

    // If we've tried all endpoints multiple times, fall back to HTTP polling
    if (this.connectionState.reconnectAttempts > this.rpcEndpoints.length * 2) {
      console.warn('WebSocket connections failed, falling back to HTTP polling');
      await this.startHttpPolling();
      return;
    }

    // Schedule reconnection attempt
    this.reconnectTimer = setTimeout(() => {
      this.initializeWebSocketConnection();
    }, backoffDelay);
  }

  private async monitorConnection(): Promise<void> {
    if (!this.wsConnection || !this.connectionState.isWebSocket) return;

    try {
      // Ping the connection to check if it's alive
      await this.wsConnection.getSlot();
      
      // Schedule next check in 30 seconds
      setTimeout(() => this.monitorConnection(), 30000);
    } catch (error) {
      console.warn('WebSocket connection lost:', error);
      this.connectionState.isConnected = false;
      await this.handleConnectionFailure();
    }
  }

  private async startHttpPolling(): Promise<void> {
    if (this.isPolling) return;

    this.isPolling = true;
    this.connectionState.isWebSocket = false;
    this.connection = this.httpConnection;

    // Poll every minute
    this.pollTimer = setInterval(async () => {
      await this.pollBalances();
    }, 60000);

    // Do initial poll
    await this.pollBalances();

    // Try to reconnect to WebSocket after 5 minutes
    setTimeout(() => {
      if (this.isPolling) {
        this.connectionState.reconnectAttempts = 0;
        this.connectionState.currentEndpointIndex = 0;
        this.initializeWebSocketConnection();
      }
    }, 300000);
  }

  private async pollBalances(): Promise<void> {
    for (const [address, callbacks] of this.balanceCallbacks.entries()) {
      if (callbacks.length > 0) {
        try {
          const balances = await this.getBalancesForAccount(address);
          
          // Check if balances changed
          const lastBalances = this.lastBalances.get(address);
          if (!this.areBalancesEqual(lastBalances, balances)) {
            this.lastBalances.set(address, balances);
            callbacks.forEach(cb => cb(balances));
          }
        } catch (error) {
          console.error(`Error polling balances for ${address}:`, error);
        }
      }
    }
  }

  private areBalancesEqual(balances1?: WalletBalance[], balances2?: WalletBalance[]): boolean {
    if (!balances1 || !balances2) return false;
    if (balances1.length !== balances2.length) return false;
    
    return balances1.every((b1, i) => {
      const b2 = balances2[i];
      return (b1.asset as any).address === (b2.asset as any).address && 
             b1.amount === b2.amount;
    });
  }

  // Real-time balance subscriptions
  async subscribeToBalances(address: string, callback: BalanceUpdateCallback): Promise<() => void> {
    // Add callback to the list
    if (!this.balanceCallbacks.has(address)) {
      this.balanceCallbacks.set(address, []);
    }
    this.balanceCallbacks.get(address)!.push(callback);

    // If using WebSocket, set up subscriptions
    if (this.connectionState.isWebSocket && this.wsConnection) {
      await this.setupAccountSubscriptions(address, callback);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.balanceCallbacks.get(address);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.unsubscribeFromAccount(address);
        }
      }
    };
  }

  private async setupAccountSubscriptions(address: string, callback: BalanceUpdateCallback): Promise<void> {
    if (!this.wsConnection) return;

    try {
      const publicKey = new PublicKey(address);

      // Subscribe to account changes
      const subId = this.wsConnection.onAccountChange(
        publicKey,
        async (_accountInfo: AccountInfo<Buffer>, _context: Context) => {
          // Fetch and emit updated balances
          const balances = await this.getBalancesForAccount(address);
          callback(balances);
        },
        'confirmed'
      );

      this.subscriptions.set(`account-${address}`, subId);

      // Also subscribe to token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      for (const { pubkey } of tokenAccounts.value) {
        const tokenSubId = this.wsConnection.onAccountChange(
          pubkey,
          async () => {
            const balances = await this.getBalancesForAccount(address);
            callback(balances);
          },
          'confirmed'
        );
        this.subscriptions.set(`token-${pubkey.toString()}`, tokenSubId);
      }
    } catch (error) {
      console.error('Error setting up account subscriptions:', error);
    }
  }

  private async unsubscribeFromAccount(address: string): Promise<void> {
    const accountSubId = this.subscriptions.get(`account-${address}`);
    if (accountSubId !== undefined && this.wsConnection) {
      await this.wsConnection.removeAccountChangeListener(accountSubId);
      this.subscriptions.delete(`account-${address}`);
    }

    // Remove token subscriptions
    for (const [key, subId] of this.subscriptions.entries()) {
      if (key.startsWith('token-') && this.wsConnection) {
        await this.wsConnection.removeAccountChangeListener(subId);
        this.subscriptions.delete(key);
      }
    }
  }

  private async cleanupSubscriptions(): Promise<void> {
    if (!this.wsConnection) return;

    for (const [key, subId] of this.subscriptions.entries()) {
      try {
        await this.wsConnection.removeAccountChangeListener(subId);
      } catch (error) {
        console.error(`Error removing subscription ${key}:`, error);
      }
    }
    this.subscriptions.clear();
  }

  // Utility to manually trigger WebSocket reconnection
  async reconnect(): Promise<void> {
    if (this.connectionState.isWebSocket) {
      console.log('Manually triggering WebSocket reconnection...');
      this.connectionState.reconnectAttempts = 0;
      this.connectionState.currentEndpointIndex = 0;
      await this.initializeWebSocketConnection();
    }
  }

  // Get current connection status
  getConnectionStatus(): ConnectionState & { rpcEndpoint: string } {
    return {
      ...this.connectionState,
      rpcEndpoint: this.rpcEndpoints[0] // Always show primary endpoint (custom or default)
    };
  }
}