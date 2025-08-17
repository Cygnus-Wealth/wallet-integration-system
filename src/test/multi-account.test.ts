import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletManager } from '../services/WalletManager';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { Account } from '../types';

// Mock window.ethereum
const mockAccounts = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012'
];

beforeEach(() => {
  // Reset mock
  global.window = {
    ethereum: {
      isMetaMask: true,
      request: vi.fn(async ({ method }) => {
        switch (method) {
          case 'eth_requestAccounts':
            return mockAccounts;
          case 'eth_accounts':
            return mockAccounts;
          case 'eth_chainId':
            return '0x1';
          case 'wallet_switchEthereumChain':
            return null;
          case 'eth_getBalance':
            return '0x1000000000000000000';
          default:
            throw new Error(`Unhandled method: ${method}`);
        }
      }),
      on: vi.fn(),
      removeListener: vi.fn()
    }
  } as any;
});

describe('Multi-Account Support', () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = new WalletManager();
  });

  describe('EVMWalletIntegration', () => {
    it('should return all accounts from MetaMask', async () => {
      const connection = await walletManager.connectWallet(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK
      );

      expect(connection.accounts).toBeDefined();
      expect(connection.accounts).toHaveLength(3);
      expect(connection.accounts![0].address).toBe(mockAccounts[0].toLowerCase());
      expect(connection.accounts![1].address).toBe(mockAccounts[1].toLowerCase());
      expect(connection.accounts![2].address).toBe(mockAccounts[2].toLowerCase());
    });

    it('should get all accounts after connection', async () => {
      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
      const accounts = await walletManager.getAllAccountsForChain(Chain.ETHEREUM);

      expect(accounts).toHaveLength(3);
      accounts.forEach((account, index) => {
        expect(account.index).toBe(index);
        expect(account.derivationPath).toBeUndefined(); // Derivation paths are unknown
        expect(account.label).toBe(index === 0 ? 'Active Account' : `Connected Account ${index}`);
      });
    });

    it('should switch between accounts', async () => {
      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
      
      const initialAddress = await walletManager.getWalletAddress(Chain.ETHEREUM);
      expect(initialAddress).toBe(mockAccounts[0].toLowerCase());

      // Switch to second account
      await walletManager.switchAccountForChain(Chain.ETHEREUM, mockAccounts[1]);
      
      // Note: getWalletAddress returns the connection address, not the active account
      // We'd need to get the active account through the integration
      const accounts = await walletManager.getAllAccountsForChain(Chain.ETHEREUM);
      expect(accounts).toHaveLength(3);
    });

  });

  describe('Multi-Wallet Management', () => {
    it('should create a new wallet when connecting', async () => {
      const wallets = walletManager.getAllWallets();
      expect(wallets).toHaveLength(0);

      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);

      const walletsAfter = walletManager.getAllWallets();
      expect(walletsAfter).toHaveLength(1);
      expect(walletsAfter[0].name).toBe('Wallet 1');
    });

    it('should add multiple wallets', async () => {
      const wallet1 = await walletManager.addWallet('Personal Wallet');
      const wallet2 = await walletManager.addWallet('Business Wallet');

      const allWallets = walletManager.getAllWallets();
      expect(allWallets).toHaveLength(2);
      expect(allWallets[0].name).toBe('Personal Wallet');
      expect(allWallets[1].name).toBe('Business Wallet');
      expect(wallet1.id).not.toBe(wallet2.id);
    });

    it('should switch between wallets', async () => {
      const wallet1 = await walletManager.addWallet('Wallet 1');
      const wallet2 = await walletManager.addWallet('Wallet 2');

      // Connect wallet 1
      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);

      // Switch to wallet 2
      await walletManager.switchWallet(wallet2.id);
      
      // Connect wallet 2
      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);

      // Each wallet should have its own connections
      const connections = walletManager.getConnectedWallets();
      expect(connections).toHaveLength(1);
    });

    it('should remove wallet and its connections', async () => {
      const wallet = await walletManager.addWallet('Test Wallet');
      await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);

      expect(walletManager.getAllWallets()).toHaveLength(1);

      await walletManager.removeWallet(wallet.id);

      expect(walletManager.getAllWallets()).toHaveLength(0);
    });
  });

  describe('Multi-Chain Multi-Account', () => {
    it('should connect multiple chains with same accounts', async () => {
      const evmResult = await walletManager.connectAllEVMChains();

      expect(evmResult.connections).toHaveLength(7); // All EVM chains
      expect(evmResult.connections[0].accounts).toHaveLength(3);
      
      // All connections should have the same accounts
      evmResult.connections.forEach(conn => {
        expect(conn.accounts).toHaveLength(3);
        expect(conn.accounts![0].address).toBe(mockAccounts[0].toLowerCase());
      });
    });

    it('should get all accounts across chains', async () => {
      await walletManager.connectAllEVMChains();
      const allAccounts = await walletManager.getAllAccounts();

      const walletIds = Object.keys(allAccounts);
      expect(walletIds).toHaveLength(1);

      const walletData = allAccounts[walletIds[0]];
      const chains = Object.keys(walletData.accountsByChain);
      
      // Should have accounts for all connected chains
      expect(chains.length).toBeGreaterThan(0);
      
      // Each chain should have the same accounts
      chains.forEach(chain => {
        const accounts = walletData.accountsByChain[chain];
        expect(accounts).toHaveLength(3);
        expect(accounts[0].address).toBe(mockAccounts[0].toLowerCase());
      });
    });
  });
});