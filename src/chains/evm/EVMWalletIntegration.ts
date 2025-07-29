import { ethers } from 'ethers';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { 
  WalletIntegration, 
  WalletConnection, 
  WalletBalance,
  TokenInfo 
} from '../../types';
import { 
  CHAIN_CONFIGS, 
  NATIVE_TOKEN_ADDRESS,
  EVM_CHAINS 
} from '../../utils/constants';
import { 
  createAssetFromToken, 
  createWalletBalance, 
  formatTokenAmount
} from '../../utils/mappers';
import { ERC20_ABI } from './abis';
import './types';

export class EVMWalletIntegration implements WalletIntegration {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private connected: boolean = false;
  
  constructor(
    public chain: Chain,
    public source: IntegrationSource
  ) {
    if (!EVM_CHAINS.includes(chain)) {
      throw new Error(`Chain ${chain} is not an EVM chain`);
    }
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

      const accounts = await this.provider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.signer = await this.provider.getSigner();
      this.connected = true;

      return {
        address: accounts[0],
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
    this.provider = null;
    this.signer = null;
    this.connected = false;
  }

  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return this.signer.getAddress();
  }

  async getBalances(): Promise<WalletBalance[]> {
    if (!this.provider || !this.signer) {
      throw new Error('Wallet not connected');
    }

    const address = await this.getAddress();
    const balances: WalletBalance[] = [];

    const nativeBalance = await this.getNativeBalance(address);
    if (nativeBalance) {
      balances.push(nativeBalance);
    }

    const tokenBalances = await this.getTokenBalances(address);
    balances.push(...tokenBalances);

    return balances;
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

  private async getNativeBalance(address: string): Promise<WalletBalance | null> {
    if (!this.provider) return null;

    try {
      const balance = await this.provider.getBalance(address);
      const chainConfig = CHAIN_CONFIGS[this.chain];
      if (!chainConfig) {
        throw new Error(`Chain ${this.chain} not configured`);
      }
      
      const token: TokenInfo = {
        address: NATIVE_TOKEN_ADDRESS,
        symbol: chainConfig.nativeCurrency.symbol,
        name: chainConfig.nativeCurrency.name,
        decimals: chainConfig.nativeCurrency.decimals,
        chain: this.chain
      };

      const asset = createAssetFromToken(token);
      const formattedAmount = formatTokenAmount(
        balance, 
        chainConfig.nativeCurrency.decimals
      );

      return createWalletBalance(
        asset,
        formattedAmount,
        address,
        this.chain
      );
    } catch (error) {
      console.error('Error fetching native balance:', error);
      return null;
    }
  }

  private async getTokenBalances(_address: string): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];
    
    return balances;
  }

  async getTokenBalance(
    address: string, 
    tokenAddress: string,
    tokenInfo: TokenInfo
  ): Promise<WalletBalance | null> {
    if (!this.provider) return null;

    try {
      const contract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const balance = await contract.balanceOf(address);
      
      if (balance === 0n) return null;

      const asset = createAssetFromToken(tokenInfo);
      const formattedAmount = formatTokenAmount(balance, tokenInfo.decimals);

      return createWalletBalance(
        asset,
        formattedAmount,
        address,
        this.chain
      );
    } catch (error) {
      console.error(`Error fetching balance for token ${tokenAddress}:`, error);
      return null;
    }
  }
}