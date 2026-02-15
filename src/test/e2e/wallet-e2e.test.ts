/**
 * WalletIntegrationSystem E2E Tests
 *
 * Tests the WalletManager library with mock ethereum providers in jsdom.
 * Covers enterprise-defined scenarios from the E2E testing strategy.
 *
 * Scenarios covered:
 *   P0: MetaMask detection and connection
 *   P0: Chain switching
 *   P1: Multi-chain connections
 *   P1: Wallet disconnect and reconnect
 *   P1: Provider not available
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { WalletManager } from '../../services/WalletManager';

const TEST_ADDRESS = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

/**
 * Creates a mock EIP-1193 ethereum provider compatible with ethers.BrowserProvider.
 * Supports configurable chain ID, accounts, and standard wallet RPC methods.
 */
function createMockEthereumProvider(options: {
  chainId?: string;
  accounts?: string[];
} = {}) {
  let currentChainId = options.chainId ?? '0x1';
  const accounts = options.accounts ?? [TEST_ADDRESS];

  return {
    isMetaMask: true,
    selectedAddress: null as string | null,
    chainId: currentChainId,

    request: async ({ method, params }: { method: string; params?: any[] }) => {
      switch (method) {
        case 'eth_requestAccounts':
          return accounts;
        case 'eth_accounts':
          return accounts;
        case 'eth_chainId':
          return currentChainId;
        case 'wallet_switchEthereumChain':
          if (params?.[0]?.chainId) {
            currentChainId = params[0].chainId;
          }
          return null;
        case 'wallet_addEthereumChain':
          return null;
        case 'eth_getBalance':
          return '0x1000000000000000000';
        case 'eth_call':
          return '0x0000000000000000000000000000000000000000000000000000000000000000';
        case 'net_version':
          return String(parseInt(currentChainId, 16));
        default:
          return null;
      }
    },

    on: () => {},
    removeListener: () => {},
    removeAllListeners: () => {}
  };
}

describe('WalletIntegrationSystem E2E Tests', () => {
  let walletManager: WalletManager;
  let originalEthereum: any;

  beforeEach(() => {
    originalEthereum = (window as any).ethereum;
    walletManager = new WalletManager();
  });

  afterEach(async () => {
    try {
      await walletManager.disconnectAll();
    } catch {
      // ignore cleanup errors
    }
    if (originalEthereum !== undefined) {
      (window as any).ethereum = originalEthereum;
    } else {
      delete (window as any).ethereum;
    }
  });

  describe('P0: MetaMask detection and connection', () => {
    it('should detect mock ethereum provider and connect wallet', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const connection = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );

      expect(connection.connected).toBe(true);
      expect(connection.address).toBe(TEST_ADDRESS);
      expect(connection.chain).toBe(Chain.ETHEREUM);
      expect(connection.source).toBe(IntegrationSource.METAMASK);
    });

    it('should return accounts on connection', async () => {
      (window as any).ethereum = createMockEthereumProvider();

      const connection = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );

      expect(connection.accounts).toBeDefined();
      expect(connection.accounts!.length).toBeGreaterThan(0);
      expect(connection.activeAccount).toBeDefined();
      expect(connection.activeAccount!.address).toBe(TEST_ADDRESS);
    });

    it('should report wallet as connected after successful connection', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);

      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(true);
      expect(walletManager.getWalletAddress(Chain.ETHEREUM)).toBe(TEST_ADDRESS);
    });
  });

  describe('P0: Chain switching', () => {
    it('should connect to Ethereum then connect to Polygon via chain switch', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const ethConnection = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );
      expect(ethConnection.chain).toBe(Chain.ETHEREUM);
      expect(ethConnection.connected).toBe(true);

      const polyConnection = await walletManager.connectWallet(
        Chain.POLYGON,
        IntegrationSource.METAMASK
      );
      expect(polyConnection.chain).toBe(Chain.POLYGON);
      expect(polyConnection.connected).toBe(true);

      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(true);
      expect(walletManager.isWalletConnected(Chain.POLYGON)).toBe(true);
    });

    it('should maintain address consistency across chain switches', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const ethConn = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );
      const polyConn = await walletManager.connectWallet(
        Chain.POLYGON,
        IntegrationSource.METAMASK
      );

      expect(ethConn.address).toBe(polyConn.address);
    });
  });

  describe('P1: Multi-chain connections', () => {
    it('should connect across Ethereum, Polygon, and BSC individually', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const chains = [Chain.ETHEREUM, Chain.POLYGON, Chain.BSC];
      const connections = [];

      for (const chain of chains) {
        const conn = await walletManager.connectWallet(chain, IntegrationSource.METAMASK);
        connections.push(conn);
      }

      expect(connections).toHaveLength(3);
      connections.forEach(conn => {
        expect(conn.connected).toBe(true);
        expect(conn.address).toBe(TEST_ADDRESS);
      });

      const connectedWallets = walletManager.getConnectedWallets();
      expect(connectedWallets).toHaveLength(3);
    });

    it('should connect all EVM chains via connectAllEVMChains', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const result = await walletManager.connectAllEVMChains(IntegrationSource.METAMASK);

      expect(result.connections.length).toBeGreaterThan(0);
      result.connections.forEach(conn => {
        expect(conn.connected).toBe(true);
        expect(conn.address).toBe(TEST_ADDRESS);
      });
    });
  });

  describe('P1: Wallet disconnect and reconnect', () => {
    it('should disconnect wallet and clear state', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(true);

      await walletManager.disconnectWallet(Chain.ETHEREUM);
      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(false);
      expect(walletManager.getWalletAddress(Chain.ETHEREUM)).toBeNull();
    });

    it('should reconnect successfully after disconnect', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      const firstConn = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );
      expect(firstConn.connected).toBe(true);

      await walletManager.disconnectWallet(Chain.ETHEREUM);
      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(false);

      const secondConn = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );
      expect(secondConn.connected).toBe(true);
      expect(secondConn.address).toBe(TEST_ADDRESS);
    });

    it('should disconnect all wallets at once', async () => {
      (window as any).ethereum = createMockEthereumProvider({ chainId: '0x1' });

      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
      await walletManager.connectWallet(Chain.POLYGON, IntegrationSource.METAMASK);

      await walletManager.disconnectAll();

      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(false);
      expect(walletManager.isWalletConnected(Chain.POLYGON)).toBe(false);
    });
  });

  describe('P1: Provider not available', () => {
    it('should throw error when no ethereum provider exists', async () => {
      delete (window as any).ethereum;

      await expect(
        walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK)
      ).rejects.toThrow('No Ethereum provider found');
    });

    it('should throw error when window.ethereum is undefined', async () => {
      (window as any).ethereum = undefined;

      await expect(
        walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK)
      ).rejects.toThrow('No Ethereum provider found');
    });

    it('should not affect state when connection fails due to missing provider', async () => {
      delete (window as any).ethereum;

      try {
        await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
      } catch {
        // expected
      }

      expect(walletManager.isWalletConnected(Chain.ETHEREUM)).toBe(false);
      expect(walletManager.getWalletAddress(Chain.ETHEREUM)).toBeNull();
      expect(walletManager.getConnectedWallets()).toHaveLength(0);
    });
  });
});
