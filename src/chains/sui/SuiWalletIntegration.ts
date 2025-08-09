import { SuiClient } from '@mysten/sui.js/client';
import { SuiEvent } from '@mysten/sui.js/client';
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

// Common interface for Sui wallets
interface SuiWalletProvider {
  hasPermissions?(permissions: string[]): Promise<boolean>;
  requestPermissions?(permissions?: string[]): Promise<boolean>;
  getAccounts(): Promise<string[]>;
  connect(permissions?: string[]): Promise<void>;
  disconnect(): Promise<void>;
  signAndExecuteTransactionBlock?(transaction: any): Promise<any>;
  on?(event: string, callback: (args: any) => void): void;
  off?(event: string, callback: (args: any) => void): void;
  // Wallet Standard methods
  features?: Record<string, any>;
  accounts?: { address: string; publicKey: string; chains: string[]; features: string[]; }[];
}

// Wallet Standard interface
interface WalletStandardWallet {
  name: string;
  version: string;
  icon?: string;
  accounts: { address: string; publicKey: string; chains: string[]; features: string[]; }[];
  features: Record<string, any>;
}

declare global {
  interface Window {
    suiet?: SuiWalletProvider;
    // Wallet Standard approach for Slush and other wallets
    addEventListener(
      type: 'wallet-standard:app-ready',
      listener: (event: CustomEvent<{ register: (wallet: any) => void }>) => void
    ): void;
  }
}

// Default RPC endpoints for SUI mainnet
const DEFAULT_RPC_ENDPOINTS = [
  'https://fullnode.mainnet.sui.io',
  'https://sui-rpc.publicnode.com',
  'https://mainnet.suiet.app',
  'https://rpc.ankr.com/sui',
  'https://sui-mainnet.nodeinfra.com'
];

interface BalanceUpdateCallback {
  (balances: WalletBalance[]): void;
}

interface ConnectionState {
  isWebSocket: boolean;
  isConnected: boolean;
  currentEndpointIndex: number;
  reconnectAttempts: number;
  lastReconnectTime?: number;
}

interface SubscriptionHandle {
  unsubscribe: () => Promise<void | boolean>;
}

export class SuiWalletIntegration implements WalletIntegration {
  private client: SuiClient;
  private wsClient: SuiClient | null = null;
  private httpClient: SuiClient;
  private provider: SuiWalletProvider | null = null;
  private walletStandard: WalletStandardWallet | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  private rpcEndpoints: string[];
  private connectionState: ConnectionState;
  private subscriptions: Map<string, SubscriptionHandle> = new Map();
  private balanceCallbacks: Map<string, BalanceUpdateCallback[]> = new Map();
  private reconnectTimer?: NodeJS.Timeout;
  private pollTimer?: NodeJS.Timeout;
  private isPolling: boolean = false;
  private lastBalances: Map<string, WalletBalance[]> = new Map();
  private monitorTimer?: NodeJS.Timeout;
  
  constructor(
    public chain: Chain = Chain.SUI,
    public source: IntegrationSource,
    config?: WalletIntegrationConfig
  ) {
    // Initialize RPC endpoints
    if (config?.rpcUrl) {
      // If custom RPC URL provided, use it as primary with defaults as fallback
      this.rpcEndpoints = [config.rpcUrl, ...DEFAULT_RPC_ENDPOINTS];
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

    // Create initial HTTP client as fallback
    this.httpClient = new SuiClient({ url: this.rpcEndpoints[0] });
    this.client = this.httpClient;

    // Attempt to establish WebSocket connection
    this.initializeWebSocketConnection();
  }

  async connect(): Promise<WalletConnection> {
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    try {
      // First, try to connect based on the source
      if (this.source === IntegrationSource.SUIET || !this.source) {
        // Try Suiet wallet (legacy approach)
        if (window.suiet) {
          return await this.connectSuiet();
        }
      }
      
      // For Slush or if Suiet not found, try Wallet Standard
      const wallet = await this.findWalletStandard();
      if (wallet) {
        return await this.connectWalletStandard(wallet);
      }

      // If we still haven't connected, throw appropriate error
      if (this.source === IntegrationSource.SUIET) {
        throw new Error('Suiet wallet not found. Please install the Suiet browser extension.');
      } else {
        throw new Error('No Sui wallet found. Please install Slush or Suiet wallet.');
      }
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  private async connectSuiet(): Promise<WalletConnection> {
    if (!window.suiet) {
      throw new Error('Suiet wallet not found');
    }

    this.provider = window.suiet;
    
    const hasPermission = await this.provider.hasPermissions?.(['viewAccount']) ?? true;
    
    if (!hasPermission && this.provider.requestPermissions) {
      await this.provider.requestPermissions();
    }
    
    const addresses = await this.provider.getAccounts();
    
    if (addresses.length === 0) {
      throw new Error('No accounts found');
    }

    // Create Account objects for all addresses
    this.accounts = addresses.map((address: string, index: number) => ({
      address,
      index,
      derivationPath: undefined, // Unknown - wallets don't expose derivation paths
      label: index === 0 ? 'Active Account' : `Connected Account ${index}`
    }));

    this.activeAccountIndex = 0;
    this.connected = true;

    return {
      address: this.accounts[0].address,
      chain: this.chain,
      source: IntegrationSource.SUIET,
      connected: true,
      connectedAt: new Date(),
      accounts: this.accounts,
      activeAccount: this.accounts[0]
    };
  }

  private async findWalletStandard(): Promise<WalletStandardWallet | null> {
    return new Promise((resolve) => {
      // Set a timeout in case wallet is not available
      const timeout = setTimeout(() => resolve(null), 2000);
      
      // Listen for wallet standard ready event
      const handleWalletReady = (event: CustomEvent) => {
        clearTimeout(timeout);
        
        const wallets: Map<string, WalletStandardWallet> = new Map();
        
        // Register function to collect wallets
        const register = (wallet: WalletStandardWallet) => {
          // Check if this is a Sui wallet
          if (wallet.accounts.some(acc => acc.chains.includes('sui:mainnet'))) {
            wallets.set(wallet.name, wallet);
          }
        };
        
        // Call the app ready handler
        if (event.detail && typeof event.detail.register === 'function') {
          event.detail.register({ register });
        }
        
        // Find appropriate wallet based on source
        let targetWallet: WalletStandardWallet | null = null;
        
        // Look for Slush wallet (could be named "Slush" or "Sui Wallet")
        for (const [name, wallet] of wallets) {
          if (name.toLowerCase().includes('slush') || name.toLowerCase().includes('sui wallet')) {
            targetWallet = wallet;
            break;
          }
        }
        
        // If no specific wallet found, use the first available Sui wallet
        if (!targetWallet && wallets.size > 0) {
          targetWallet = wallets.values().next().value || null;
        }
        
        resolve(targetWallet);
      };
      
      window.addEventListener('wallet-standard:app-ready', handleWalletReady as any);
      
      // Dispatch event to trigger wallet registration
      window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {
        detail: {
          register: (wallet: any) => {
            if (wallet.register) {
              handleWalletReady(new CustomEvent('wallet-standard:app-ready', {
                detail: wallet
              }));
            }
          }
        }
      }));
    });
  }

  private async connectWalletStandard(wallet: WalletStandardWallet): Promise<WalletConnection> {
    this.walletStandard = wallet;
    
    // Get accounts from wallet
    const accounts = wallet.accounts.filter(acc => acc.chains.includes('sui:mainnet'));
    
    if (accounts.length === 0) {
      throw new Error('No Sui accounts found in wallet');
    }

    // Use the connect feature if available
    const connectFeature = wallet.features['standard:connect'];
    if (connectFeature && typeof connectFeature.connect === 'function') {
      await connectFeature.connect();
    }

    // Create Account objects
    this.accounts = accounts.map((account, index) => ({
      address: account.address,
      index,
      derivationPath: undefined, // Unknown - wallets don't expose derivation paths
      label: index === 0 ? 'Active Account' : `Connected Account ${index}`
    }));

    this.activeAccountIndex = 0;
    this.connected = true;

    // Determine the actual source based on wallet name
    let actualSource = this.source;
    if (wallet.name.toLowerCase().includes('slush') || wallet.name.toLowerCase().includes('sui wallet')) {
      actualSource = IntegrationSource.OTHER; // Since SLUSH is not in the enum yet
    }

    return {
      address: this.accounts[0].address,
      chain: this.chain,
      source: actualSource,
      connected: true,
      connectedAt: new Date(),
      accounts: this.accounts,
      activeAccount: this.accounts[0]
    };
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
    if (this.monitorTimer) {
      clearTimeout(this.monitorTimer);
      this.monitorTimer = undefined;
    }

    // Disconnect wallet
    if (this.provider && this.provider.disconnect) {
      await this.provider.disconnect();
    }
    
    if (this.walletStandard) {
      const disconnectFeature = this.walletStandard.features['standard:disconnect'];
      if (disconnectFeature && typeof disconnectFeature.disconnect === 'function') {
        await disconnectFeature.disconnect();
      }
    }
    
    this.connected = false;
    this.provider = null;
    this.walletStandard = null;
    this.accounts = [];
    this.activeAccountIndex = 0;

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
    
    // Try to refresh accounts
    if (this.provider && this.provider.getAccounts) {
      try {
        const addresses = await this.provider.getAccounts();
        
        // Update accounts if changed
        if (addresses.length !== this.accounts.length) {
          this.accounts = addresses.map((address: string, index: number) => ({
            address,
            index,
            derivationPath: undefined,
            label: index === 0 ? 'Active Account' : `Connected Account ${index}`
          }));
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    } else if (this.walletStandard) {
      // For wallet standard, accounts are static from initial connection
      const accounts = this.walletStandard.accounts.filter(acc => acc.chains.includes('sui:mainnet'));
      if (accounts.length !== this.accounts.length) {
        this.accounts = accounts.map((account, index) => ({
          address: account.address,
          index,
          derivationPath: undefined,
          label: index === 0 ? 'Active Account' : `Connected Account ${index}`
        }));
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
    
    // Note: Most Sui wallets don't support programmatic account switching
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

  // WebSocket connection management
  private async initializeWebSocketConnection(): Promise<void> {
    const wsUrl = this.getWebSocketUrl(this.rpcEndpoints[this.connectionState.currentEndpointIndex]);
    
    try {
      // Create WebSocket client
      this.wsClient = new SuiClient({ 
        url: wsUrl
      });

      // Test the connection
      await this.wsClient.getLatestSuiSystemState();
      
      this.client = this.wsClient;
      this.connectionState.isWebSocket = true;
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;

      console.log(`WebSocket connected to: ${wsUrl}`);

      // Set up connection monitoring
      this.monitorConnection();
    } catch (error) {
      console.warn(`Failed to connect WebSocket to ${wsUrl}:`, error);
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
    if (!this.wsClient || !this.connectionState.isWebSocket) return;

    try {
      // Ping the connection to check if it's alive
      await this.wsClient.getLatestSuiSystemState();
      
      // Schedule next check in 30 seconds
      this.monitorTimer = setTimeout(() => this.monitorConnection(), 30000);
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
    this.client = this.httpClient;

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
    if (this.connectionState.isWebSocket && this.wsClient) {
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
    if (!this.wsClient) return;

    try {
      // Subscribe to events for this address
      const unsubscribe = await this.wsClient.subscribeEvent({
        filter: {
          Sender: address
        },
        onMessage: async (_event: SuiEvent) => {
          // Fetch and emit updated balances when events occur
          const balances = await this.getBalancesForAccount(address);
          callback(balances);
        }
      });

      // Store subscription handle
      this.subscriptions.set(`events-${address}`, { unsubscribe: async () => { await unsubscribe(); } });

      // Also subscribe to coin balance changes
      const coinUnsubscribe = await this.wsClient.subscribeEvent({
        filter: {
          MoveEventType: '0x2::coin::CoinBalance'
        },
        onMessage: async (event: SuiEvent) => {
          // Check if event affects our address
          if ((event as any).parsedJson?.owner === address) {
            const balances = await this.getBalancesForAccount(address);
            callback(balances);
          }
        }
      });

      this.subscriptions.set(`coins-${address}`, { unsubscribe: async () => { await coinUnsubscribe(); } });
    } catch (error) {
      console.error('Error setting up account subscriptions:', error);
    }
  }

  private async unsubscribeFromAccount(address: string): Promise<void> {
    // Unsubscribe from events
    const eventSub = this.subscriptions.get(`events-${address}`);
    if (eventSub) {
      await eventSub.unsubscribe();
      this.subscriptions.delete(`events-${address}`);
    }

    // Unsubscribe from coin balance changes
    const coinSub = this.subscriptions.get(`coins-${address}`);
    if (coinSub) {
      await coinSub.unsubscribe();
      this.subscriptions.delete(`coins-${address}`);
    }
  }

  private async cleanupSubscriptions(): Promise<void> {
    for (const [key, sub] of this.subscriptions.entries()) {
      try {
        await sub.unsubscribe();
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