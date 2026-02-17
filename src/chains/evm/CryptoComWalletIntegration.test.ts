import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { CryptoComWalletIntegration } from './CryptoComWalletIntegration';
import { EVM_CHAINS } from '../../utils/constants';

/**
 * Unit Tests for CryptoComWalletIntegration
 *
 * Crypto.com Onchain Wallet (DeFi Wallet) is an EVM-compatible browser extension
 * that injects its provider at window.deficonnectProvider or window.ethereum.
 */
describe('CryptoComWalletIntegration', () => {
  let originalWindow: any;

  beforeEach(() => {
    // Save original window properties
    originalWindow = {
      deficonnectProvider: (globalThis as any).window?.deficonnectProvider,
      ethereum: (globalThis as any).window?.ethereum,
    };

    // Ensure window exists in test environment
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {};
    }
  });

  afterEach(() => {
    // Restore original window properties
    if ((globalThis as any).window) {
      (globalThis as any).window.deficonnectProvider = originalWindow.deficonnectProvider;
      (globalThis as any).window.ethereum = originalWindow.ethereum;
    }
  });

  function createMockProvider(accounts: string[] = ['0xabc123def456']) {
    return {
      isDeficonnectProvider: true,
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts') return accounts;
        if (method === 'eth_accounts') return accounts;
        if (method === 'eth_chainId') return '0x19'; // Cronos mainnet (25)
        if (method === 'wallet_switchEthereumChain') return null;
        if (method === 'wallet_addEthereumChain') return null;
        return null;
      }),
    };
  }

  describe('Constructor', () => {
    it('should create instance with chain and source', () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(IntegrationSource.OTHER);
    });

    it('should accept EVM chains', () => {
      EVM_CHAINS.forEach(chain => {
        const integration = new CryptoComWalletIntegration(
          chain,
          IntegrationSource.OTHER
        );
        expect(integration.chain).toBe(chain);
      });
    });

    it('should throw for non-EVM chains', () => {
      expect(() => {
        new CryptoComWalletIntegration(
          Chain.SOLANA,
          IntegrationSource.OTHER
        );
      }).toThrow();
    });

    it('should accept optional config', () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER,
        { rpcUrl: 'https://custom-rpc.example.com' }
      );
      expect(integration).toBeDefined();
    });

    it('should start disconnected', () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );
      expect(integration.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should connect via deficonnectProvider when available', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const connection = await integration.connect();

      expect(connection.connected).toBe(true);
      expect(connection.address).toBe('0xabc123def456');
      expect(connection.chain).toBe(Chain.ETHEREUM);
      expect(connection.source).toBe(IntegrationSource.OTHER);
      expect(connection.connectedAt).toBeInstanceOf(Date);
    });

    it('should fall back to window.ethereum with isCryptoComWallet flag', async () => {
      const mockProvider = createMockProvider();
      (mockProvider as any).isCryptoComWallet = true;
      delete (globalThis as any).window.deficonnectProvider;
      (globalThis as any).window.ethereum = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const connection = await integration.connect();

      expect(connection.connected).toBe(true);
      expect(connection.address).toBe('0xabc123def456');
    });

    it('should throw when no Crypto.com provider is found', async () => {
      delete (globalThis as any).window.deficonnectProvider;
      delete (globalThis as any).window.ethereum;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await expect(integration.connect()).rejects.toThrow(
        'Crypto.com Onchain wallet not found'
      );
    });

    it('should populate accounts from provider', async () => {
      const addresses = ['0xaaa111', '0xbbb222', '0xccc333'];
      const mockProvider = createMockProvider(addresses);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const connection = await integration.connect();

      expect(connection.accounts).toHaveLength(3);
      expect(connection.accounts![0].address).toBe('0xaaa111');
      expect(connection.accounts![1].address).toBe('0xbbb222');
      expect(connection.accounts![2].address).toBe('0xccc333');
    });

    it('should set active account to first account', async () => {
      const addresses = ['0xaaa111', '0xbbb222'];
      const mockProvider = createMockProvider(addresses);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const connection = await integration.connect();

      expect(connection.activeAccount?.address).toBe('0xaaa111');
    });

    it('should throw when no accounts returned', async () => {
      const mockProvider = createMockProvider([]);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await expect(integration.connect()).rejects.toThrow('No accounts found');
    });

    it('should return cached connection on subsequent calls', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const conn1 = await integration.connect();
      const conn2 = await integration.connect();

      expect(conn1).toEqual(conn2);
      // eth_requestAccounts should only be called once
      const requestAccountsCalls = mockProvider.request.mock.calls.filter(
        (call: any) => call[0].method === 'eth_requestAccounts'
      );
      expect(requestAccountsCalls).toHaveLength(1);
    });
  });

  describe('disconnect', () => {
    it('should set connected to false', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      await integration.disconnect();

      expect(integration.isConnected()).toBe(false);
    });

    it('should clear accounts', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      await integration.disconnect();

      await expect(integration.getAddress()).rejects.toThrow();
    });
  });

  describe('getAddress', () => {
    it('should return active account address', async () => {
      const mockProvider = createMockProvider(['0xtest123']);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      const address = await integration.getAddress();

      expect(address).toBe('0xtest123');
    });

    it('should throw when not connected', async () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await expect(integration.getAddress()).rejects.toThrow('Wallet not connected');
    });
  });

  describe('getAllAccounts', () => {
    it('should return all accounts', async () => {
      const addresses = ['0xaaa', '0xbbb'];
      const mockProvider = createMockProvider(addresses);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      const accounts = await integration.getAllAccounts();

      expect(accounts).toHaveLength(2);
    });

    it('should throw when not connected', async () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await expect(integration.getAllAccounts()).rejects.toThrow('Wallet not connected');
    });
  });

  describe('switchAccount', () => {
    it('should switch to valid account', async () => {
      const addresses = ['0xaaa', '0xbbb'];
      const mockProvider = createMockProvider(addresses);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      await integration.switchAccount('0xbbb');
      const address = await integration.getAddress();

      expect(address).toBe('0xbbb');
    });

    it('should throw for invalid account', async () => {
      const mockProvider = createMockProvider(['0xaaa']);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();

      await expect(integration.switchAccount('0xnonexistent')).rejects.toThrow();
    });

    it('should throw when not connected', async () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await expect(integration.switchAccount('0xaaa')).rejects.toThrow('Wallet not connected');
    });
  });

  describe('getActiveAccount', () => {
    it('should return active account when connected', async () => {
      const mockProvider = createMockProvider(['0xaaa']);
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      const account = await integration.getActiveAccount();

      expect(account).not.toBeNull();
      expect(account?.address).toBe('0xaaa');
    });

    it('should return null when not connected', async () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      const account = await integration.getActiveAccount();
      expect(account).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      expect(integration.isConnected()).toBe(false);
    });

    it('should return true after connecting', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      expect(integration.isConnected()).toBe(true);
    });

    it('should return false after disconnecting', async () => {
      const mockProvider = createMockProvider();
      (globalThis as any).window.deficonnectProvider = mockProvider;

      const integration = new CryptoComWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.OTHER
      );

      await integration.connect();
      await integration.disconnect();
      expect(integration.isConnected()).toBe(false);
    });
  });
});
