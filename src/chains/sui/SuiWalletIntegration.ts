import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  WalletIntegration, 
  WalletConnection, 
  Account,
  WalletIntegrationConfig
} from '../../types';

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

export class SuiWalletIntegration implements WalletIntegration {
  private provider: SuiWalletProvider | null = null;
  private walletStandard: WalletStandardWallet | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  
  constructor(
    public chain: Chain = Chain.SUI,
    public source: IntegrationSource,
    _config?: WalletIntegrationConfig
  ) {
    // Configuration can be used for future extensions if needed
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
  }

  async getActiveAccount(): Promise<Account | null> {
    if (!this.connected || this.accounts.length === 0) {
      return null;
    }
    return this.accounts[this.activeAccountIndex];
  }

  isConnected(): boolean {
    return this.connected;
  }
}