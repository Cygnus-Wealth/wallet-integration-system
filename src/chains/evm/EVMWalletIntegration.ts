import { ethers } from 'ethers';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  WalletIntegration, 
  WalletConnection, 
  Account,
  WalletIntegrationConfig 
} from '../../types';
import { 
  CHAIN_CONFIGS, 
  EVM_CHAINS 
} from '../../utils/constants';
import './types';

export class EVMWalletIntegration implements WalletIntegration {
  private provider: ethers.BrowserProvider | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  
  constructor(
    public chain: Chain,
    public source: IntegrationSource,
    _config?: WalletIntegrationConfig // Unused for EVM as it uses injected provider
  ) {
    if (!EVM_CHAINS.includes(chain)) {
      throw new Error(`Chain ${chain} is not an EVM chain`);
    }
    // EVM wallets use the injected provider (MetaMask, etc.) 
    // which manages its own RPC connections
  }

  async connect(): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Ethereum provider found');
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      const chainConfig = CHAIN_CONFIGS[this.chain];
      if (!chainConfig) {
        throw new Error(`Chain ${this.chain} not configured`);
      }
      
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      if (parseInt(currentChainId, 16) !== chainConfig.chainId) {
        await this.switchChain(chainConfig.chainId as number);
      }

      const addresses = await this.provider.send('eth_requestAccounts', []);
      
      if (addresses.length === 0) {
        throw new Error('No accounts found');
      }

      // Create Account objects for all addresses
      // Note: We cannot determine the actual derivation paths or which wallet/mnemonic
      // each address belongs to. MetaMask returns all previously connected addresses
      // across all configured wallets (mnemonics, hardware wallets, imported keys)
      this.accounts = addresses.map((address: string, index: number) => ({
        address: address.toLowerCase(),
        index,
        derivationPath: undefined, // Unknown - could be from any wallet/path
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
    this.provider = null;
    this.connected = false;
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
    
    // Try to get fresh account list from provider
    if (this.provider && window.ethereum) {
      try {
        const addresses = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        // Update accounts if changed
        if (addresses.length !== this.accounts.length) {
          this.accounts = addresses.map((address: string, index: number) => ({
            address: address.toLowerCase(),
            index,
            derivationPath: undefined, // Unknown - could be from any wallet/path
            label: index === 0 ? 'Active Account' : `Connected Account ${index}`
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
      acc => acc.address.toLowerCase() === address.toLowerCase()
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

  private async switchChain(chainId: number): Promise<void> {
    const chainIdHex = `0x${chainId.toString(16)}`;
    
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
    } catch (error: any) {
      if (error.code === 4902) {
        const chainConfig = CHAIN_CONFIGS[this.chain];
        if (!chainConfig) {
          throw new Error(`Chain ${this.chain} not configured`);
        }
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: this.chain,
            nativeCurrency: chainConfig.nativeCurrency,
            rpcUrls: [chainConfig.rpcUrl],
            blockExplorerUrls: [chainConfig.blockExplorerUrl]
          }]
        });
      } else {
        throw error;
      }
    }
  }

}