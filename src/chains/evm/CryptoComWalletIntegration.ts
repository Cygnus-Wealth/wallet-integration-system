import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import {
  WalletIntegration,
  WalletConnection,
  Account,
  WalletIntegrationConfig,
  NetworkEnvironment
} from '../../types';
import { EVM_CHAINS } from '../../utils/constants';
import { getChainConfig } from '../../config/chain-presets';
import './types';

interface CryptoComProvider {
  isDeficonnectProvider?: boolean;
  isCryptoComWallet?: boolean;
  request(args: { method: string; params?: any[] }): Promise<any>;
}

declare global {
  interface Window {
    deficonnectProvider?: CryptoComProvider;
  }
}

export class CryptoComWalletIntegration implements WalletIntegration {
  private provider: CryptoComProvider | null = null;
  private connected: boolean = false;
  private accounts: Account[] = [];
  private activeAccountIndex: number = 0;
  private lastConnection: WalletConnection | null = null;
  private environment: NetworkEnvironment;

  constructor(
    public chain: Chain,
    public source: IntegrationSource,
    config?: WalletIntegrationConfig
  ) {
    if (!EVM_CHAINS.includes(chain)) {
      throw new Error(`Chain ${chain} is not an EVM chain`);
    }
    this.environment = config?.environment ?? NetworkEnvironment.PRODUCTION;
  }

  async connect(): Promise<WalletConnection> {
    if (this.connected && this.lastConnection) {
      return this.lastConnection;
    }

    const provider = this.findProvider();
    if (!provider) {
      throw new Error(
        'Crypto.com Onchain wallet not found. Please install the Crypto.com DeFi Wallet extension.'
      );
    }

    this.provider = provider;

    const chainConfig = getChainConfig(this.chain, this.environment);
    if (chainConfig && typeof chainConfig.chainId === 'number') {
      try {
        const currentChainId = await this.provider.request({
          method: 'eth_chainId'
        });
        if (parseInt(currentChainId, 16) !== chainConfig.chainId) {
          await this.switchChain(chainConfig.chainId);
        }
      } catch {
        // Chain switching not critical for connection
      }
    }

    const addresses: string[] = await this.provider.request({
      method: 'eth_requestAccounts'
    });

    if (addresses.length === 0) {
      throw new Error('No accounts found');
    }

    this.accounts = addresses.map((address: string, index: number) => ({
      address: address.toLowerCase(),
      index,
      derivationPath: undefined,
      label: index === 0 ? 'Active Account' : `Connected Account ${index}`
    }));

    this.activeAccountIndex = 0;
    this.connected = true;

    const connection: WalletConnection = {
      address: this.accounts[0].address,
      chain: this.chain,
      source: this.source,
      connected: true,
      connectedAt: new Date(),
      accounts: this.accounts,
      activeAccount: this.accounts[0]
    };

    this.lastConnection = connection;
    return connection;
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.connected = false;
    this.accounts = [];
    this.activeAccountIndex = 0;
    this.lastConnection = null;
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

    if (this.provider) {
      try {
        const addresses: string[] = await this.provider.request({
          method: 'eth_accounts'
        });

        if (addresses.length !== this.accounts.length) {
          this.accounts = addresses.map((address: string, index: number) => ({
            address: address.toLowerCase(),
            index,
            derivationPath: undefined,
            label: index === 0 ? 'Active Account' : `Connected Account ${index}`
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

  private findProvider(): CryptoComProvider | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Prefer the dedicated Crypto.com DeFi Wallet provider
    if (window.deficonnectProvider?.isDeficonnectProvider) {
      return window.deficonnectProvider;
    }

    // Fall back to window.ethereum if it identifies as Crypto.com
    if (window.ethereum && (window.ethereum as any).isCryptoComWallet) {
      return window.ethereum as unknown as CryptoComProvider;
    }

    return null;
  }

  private async switchChain(chainId: number): Promise<void> {
    if (!this.provider) return;

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
    } catch (error: any) {
      if (error.code === 4902) {
        const chainConfig = getChainConfig(this.chain, this.environment);
        if (!chainConfig) {
          throw new Error(`Chain ${this.chain} not configured for ${this.environment} environment`);
        }
        await this.provider.request({
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
