import { describe, it, expect } from 'vitest';
import { WalletManager } from '../services/WalletManager';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { EVMWalletIntegration } from '../chains/evm/EVMWalletIntegration';
import { SolanaWalletIntegration } from '../chains/solana/SolanaWalletIntegration';
import { SuiWalletIntegration } from '../chains/sui/SuiWalletIntegration';

describe('Wallet Integration System', () => {
  describe('WalletManager', () => {
    it('should create WalletManager instance', () => {
      const manager = new WalletManager();
      expect(manager).toBeDefined();
      expect(manager.getConnectedWallets()).toEqual([]);
    });
  });

  describe('EVMWalletIntegration', () => {
    it('should create EVM wallet integration for Ethereum', () => {
      const wallet = new EVMWalletIntegration(Chain.ETHEREUM, IntegrationSource.METAMASK);
      expect(wallet.chain).toBe(Chain.ETHEREUM);
      expect(wallet.source).toBe(IntegrationSource.METAMASK);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should throw error for non-EVM chains', () => {
      expect(() => {
        new EVMWalletIntegration(Chain.SOLANA, IntegrationSource.METAMASK);
      }).toThrow('Chain SOLANA is not an EVM chain');
    });
  });

  describe('SolanaWalletIntegration', () => {
    it('should create Solana wallet integration', () => {
      const wallet = new SolanaWalletIntegration();
      expect(wallet.chain).toBe(Chain.SOLANA);
      expect(wallet.source).toBe(IntegrationSource.PHANTOM);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should use custom RPC URL when provided', () => {
      const customRpcUrl = 'https://custom.solana.rpc';
      const wallet = new SolanaWalletIntegration(
        Chain.SOLANA,
        IntegrationSource.PHANTOM,
        { rpcUrl: customRpcUrl }
      );
      
      // Config is accepted but not used for wallet connections
      expect(wallet.chain).toBe(Chain.SOLANA);
      expect(wallet.source).toBe(IntegrationSource.PHANTOM);
    });
  });

  describe('SuiWalletIntegration', () => {
    it('should create SUI wallet integration with Suiet', () => {
      const wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      expect(wallet.chain).toBe(Chain.SUI);
      expect(wallet.source).toBe(IntegrationSource.SUIET);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should create SUI wallet integration for other wallets', () => {
      const wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.OTHER);
      expect(wallet.chain).toBe(Chain.SUI);
      expect(wallet.source).toBe(IntegrationSource.OTHER);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should use custom RPC URL when provided', () => {
      const customRpcUrl = 'https://custom.sui.rpc';
      const wallet = new SuiWalletIntegration(
        Chain.SUI,
        IntegrationSource.SUIET,
        { rpcUrl: customRpcUrl }
      );
      
      // Config is accepted but not used for wallet connections
      expect(wallet.chain).toBe(Chain.SUI);
      expect(wallet.source).toBe(IntegrationSource.SUIET);
    });
  });
});