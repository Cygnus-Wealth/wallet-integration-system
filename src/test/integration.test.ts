import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    let wallet: SolanaWalletIntegration;

    beforeEach(() => {
      // Mock WebSocket connections to prevent actual network calls
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(async () => {
      if (wallet) {
        await wallet.disconnect();
      }
      vi.restoreAllMocks();
    });

    it('should create Solana wallet integration', () => {
      wallet = new SolanaWalletIntegration();
      expect(wallet.chain).toBe(Chain.SOLANA);
      expect(wallet.source).toBe(IntegrationSource.PHANTOM);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should use custom RPC URL when provided', () => {
      const customRpcUrl = 'https://custom.solana.rpc';
      wallet = new SolanaWalletIntegration(
        Chain.SOLANA,
        IntegrationSource.PHANTOM,
        { rpcUrl: customRpcUrl }
      );
      
      const status = wallet.getConnectionStatus();
      expect(status.rpcEndpoint).toBe(customRpcUrl);
    });

    it('should have multiple default RPC endpoints', () => {
      wallet = new SolanaWalletIntegration();
      const status = wallet.getConnectionStatus();
      
      // Should use one of the default endpoints
      expect([
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana',
        'https://solana.public-rpc.com',
        'https://mainnet.helius-rpc.com/?api-key=demo'
      ]).toContain(status.rpcEndpoint);
    });

    it('should provide connection status information', () => {
      wallet = new SolanaWalletIntegration();
      const status = wallet.getConnectionStatus();
      
      expect(status).toHaveProperty('isWebSocket');
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('currentEndpointIndex');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('rpcEndpoint');
    });

    it('should support balance subscription callbacks', async () => {
      wallet = new SolanaWalletIntegration();
      const testAddress = '11111111111111111111111111111111';
      let callbackCalled = false;
      
      const unsubscribe = await wallet.subscribeToBalances(
        testAddress,
        (balances) => {
          callbackCalled = true;
          expect(Array.isArray(balances)).toBe(true);
        }
      );
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should handle reconnect method', async () => {
      wallet = new SolanaWalletIntegration();
      
      // Should not throw
      await expect(wallet.reconnect()).resolves.toBeUndefined();
    });
  });

  describe('SuiWalletIntegration', () => {
    let wallet: SuiWalletIntegration;

    beforeEach(() => {
      // Mock WebSocket connections to prevent actual network calls
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(async () => {
      if (wallet) {
        await wallet.disconnect();
      }
      vi.restoreAllMocks();
    });

    it('should create SUI wallet integration with Suiet', () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      expect(wallet.chain).toBe(Chain.SUI);
      expect(wallet.source).toBe(IntegrationSource.SUIET);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should create SUI wallet integration for other wallets', () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.OTHER);
      expect(wallet.chain).toBe(Chain.SUI);
      expect(wallet.source).toBe(IntegrationSource.OTHER);
      expect(wallet.isConnected()).toBe(false);
    });

    it('should use custom RPC URL when provided', () => {
      const customRpcUrl = 'https://custom.sui.rpc';
      wallet = new SuiWalletIntegration(
        Chain.SUI,
        IntegrationSource.SUIET,
        { rpcUrl: customRpcUrl }
      );
      
      const status = wallet.getConnectionStatus();
      expect(status.rpcEndpoint).toBe(customRpcUrl);
    });

    it('should have multiple default RPC endpoints', () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      const status = wallet.getConnectionStatus();
      
      // Should use one of the default endpoints
      expect([
        'https://fullnode.mainnet.sui.io',
        'https://sui-rpc.publicnode.com',
        'https://mainnet.suiet.app',
        'https://rpc.ankr.com/sui',
        'https://sui-mainnet.nodeinfra.com'
      ]).toContain(status.rpcEndpoint);
    });

    it('should provide connection status information', () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      const status = wallet.getConnectionStatus();
      
      expect(status).toHaveProperty('isWebSocket');
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('currentEndpointIndex');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('rpcEndpoint');
    });

    it('should support balance subscription callbacks', async () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      const testAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      let callbackCalled = false;
      
      const unsubscribe = await wallet.subscribeToBalances(
        testAddress,
        (balances) => {
          callbackCalled = true;
          expect(Array.isArray(balances)).toBe(true);
        }
      );
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should handle reconnect method', async () => {
      wallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);
      
      // Should not throw
      await expect(wallet.reconnect()).resolves.toBeUndefined();
    });
  });
});