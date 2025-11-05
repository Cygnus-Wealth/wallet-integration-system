import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { BaseWalletIntegration } from './BaseWalletIntegration';
import { Account } from '../types';
import {
  WalletNotConnectedError,
  AccountNotFoundError,
  WalletExtensionNotFoundError
} from '../errors/WalletErrors';

/**
 * Concrete implementation for testing the abstract BaseWalletIntegration
 */
class TestWalletIntegration extends BaseWalletIntegration {
  // Mock methods that can be spied on
  connectToProviderMock = vi.fn();
  disconnectFromProviderMock = vi.fn();
  getAccountsFromProviderMock = vi.fn();

  protected async connectToProvider(): Promise<Account[]> {
    return this.connectToProviderMock();
  }

  protected async disconnectFromProvider(): Promise<void> {
    return this.disconnectFromProviderMock();
  }

  protected async getAccountsFromProvider(): Promise<Account[]> {
    return this.getAccountsFromProviderMock();
  }
}

/**
 * Unit Tests for BaseWalletIntegration Abstract Class
 *
 * Tests the template method pattern and common integration logic.
 */
describe('BaseWalletIntegration', () => {
  let integration: TestWalletIntegration;
  const mockAccounts: Account[] = [
    { address: '0xaaa', index: 0, label: 'Account 1' },
    { address: '0xbbb', index: 1, label: 'Account 2' },
    { address: '0xccc', index: 2, label: 'Account 3' }
  ];

  beforeEach(() => {
    integration = new TestWalletIntegration(
      Chain.ETHEREUM,
      IntegrationSource.METAMASK
    );
  });

  describe('Constructor', () => {
    it('should initialize with correct chain and source', () => {
      // Assert
      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(IntegrationSource.METAMASK);
    });

    it('should start in disconnected state', () => {
      // Assert
      expect(integration.isConnected()).toBe(false);
    });

    it('should accept optional configuration', () => {
      // Arrange
      const config = { rpcUrl: 'https://custom-rpc.com' };

      // Act
      const integrationWithConfig = new TestWalletIntegration(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK,
        config
      );

      // Assert
      expect(integrationWithConfig).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should call connectToProvider on first connection', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);

      // Act
      await integration.connect();

      // Assert
      expect(integration.connectToProviderMock).toHaveBeenCalledTimes(1);
    });

    it('should set connected state to true', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);

      // Act
      await integration.connect();

      // Assert
      expect(integration.isConnected()).toBe(true);
    });

    it('should store returned accounts', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      integration.getAccountsFromProviderMock.mockResolvedValue(mockAccounts);

      // Act
      await integration.connect();
      const accounts = await integration.getAllAccounts();

      // Assert
      expect(accounts).toHaveLength(3);
    });

    it('should return WalletConnection with accounts', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);

      // Act
      const connection = await integration.connect();

      // Assert
      expect(connection.address).toBe('0xaaa'); // First account
      expect(connection.chain).toBe(Chain.ETHEREUM);
      expect(connection.source).toBe(IntegrationSource.METAMASK);
      expect(connection.connected).toBe(true);
      expect(connection.accounts).toHaveLength(3);
      expect(connection.activeAccount).toEqual(mockAccounts[0]);
      expect(connection.connectedAt).toBeInstanceOf(Date);
    });

    it('should return cached connection on subsequent calls', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      const connection1 = await integration.connect();
      const connection2 = await integration.connect();

      // Assert
      expect(integration.connectToProviderMock).toHaveBeenCalledTimes(1); // Only once
      expect(connection1).toBe(connection2); // Same object
    });

    it('should propagate errors from doConnect', async () => {
      // Arrange
      integration.connectToProviderMock.mockRejectedValue(
        new WalletExtensionNotFoundError('MetaMask')
      );

      // Act & Assert
      await expect(integration.connect()).rejects.toThrow(
        WalletExtensionNotFoundError
      );
    });
  });

  describe('disconnect', () => {
    it('should call doDisconnect when connected', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      await integration.disconnect();

      // Assert
      expect(integration.disconnectFromProviderMock).toHaveBeenCalledTimes(1);
    });

    it('should set connected state to false', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      await integration.disconnect();

      // Assert
      expect(integration.isConnected()).toBe(false);
    });

    it('should clear accounts', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      await integration.disconnect();

      // Assert
      await expect(integration.getAddress()).rejects.toThrow(
        WalletNotConnectedError
      );
    });

    it('should not call doDisconnect when already disconnected', async () => {
      // Act
      await integration.disconnect();

      // Assert
      expect(integration.disconnectFromProviderMock).not.toHaveBeenCalled();
    });

    it('should clear cached connection', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      await integration.disconnect();
      await integration.connect();

      // Assert
      expect(integration.connectToProviderMock).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('getAddress', () => {
    it('should return active account address when connected', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      const address = await integration.getAddress();

      // Assert
      expect(address).toBe('0xaaa');
    });

    it('should throw when not connected', async () => {
      // Act & Assert
      await expect(integration.getAddress()).rejects.toThrow(
        WalletNotConnectedError
      );
    });

    it('should return current active account after switching', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();
      await integration.switchAccount('0xbbb');

      // Act
      const address = await integration.getAddress();

      // Assert
      expect(address).toBe('0xbbb');
    });
  });

  describe('getAllAccounts', () => {
    it('should call fetchAccounts when connected', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      integration.getAccountsFromProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      await integration.getAllAccounts();

      // Assert
      expect(integration.getAccountsFromProviderMock).toHaveBeenCalledTimes(1);
    });

    it('should return fresh account list', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      const updatedAccounts = [...mockAccounts, { address: '0xddd', index: 3 }];
      integration.getAccountsFromProviderMock.mockResolvedValue(updatedAccounts);
      await integration.connect();

      // Act
      const accounts = await integration.getAllAccounts();

      // Assert
      expect(accounts).toHaveLength(4);
      expect(accounts[3].address).toBe('0xddd');
    });

    it('should throw when not connected', async () => {
      // Act & Assert
      await expect(integration.getAllAccounts()).rejects.toThrow(
        WalletNotConnectedError
      );
    });

    it('should return copy of accounts array', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      integration.getAccountsFromProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      const accounts1 = await integration.getAllAccounts();
      const accounts2 = await integration.getAllAccounts();

      // Assert
      expect(accounts1).not.toBe(accounts2); // Different array instances
      expect(accounts1).toEqual(accounts2); // Same content
    });
  });

  describe('switchAccount', () => {
    beforeEach(async () => {
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();
    });

    it('should update active account index', async () => {
      // Act
      await integration.switchAccount('0xbbb');
      const address = await integration.getAddress();

      // Assert
      expect(address).toBe('0xbbb');
    });

    it('should be case-insensitive', async () => {
      // Act
      await integration.switchAccount('0xBBB');
      const address = await integration.getAddress();

      // Assert
      expect(address).toBe('0xbbb');
    });

    it('should throw AccountNotFoundError for unknown address', async () => {
      // Act & Assert
      await expect(
        integration.switchAccount('0xzzz')
      ).rejects.toThrow(AccountNotFoundError);
    });

    it('should throw WalletNotConnectedError when not connected', async () => {
      // Arrange
      await integration.disconnect();

      // Act & Assert
      await expect(
        integration.switchAccount('0xbbb')
      ).rejects.toThrow(WalletNotConnectedError);
    });

    it('should include available addresses in error', async () => {
      // Act & Assert
      try {
        await integration.switchAccount('0xzzz');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AccountNotFoundError);
        const accountError = error as AccountNotFoundError;
        expect(accountError.availableAccounts).toContain('0xaaa');
        expect(accountError.availableAccounts).toContain('0xbbb');
        expect(accountError.availableAccounts).toContain('0xccc');
      }
    });
  });

  describe('getActiveAccount', () => {
    it('should return active account when connected', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Act
      const account = await integration.getActiveAccount();

      // Assert
      expect(account).not.toBeNull();
      expect(account?.address).toBe('0xaaa');
      expect(account?.index).toBe(0);
    });

    it('should return null when not connected', async () => {
      // Act
      const account = await integration.getActiveAccount();

      // Assert
      expect(account).toBeNull();
    });

    it('should return current active account after switching', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();
      await integration.switchAccount('0xccc');

      // Act
      const account = await integration.getActiveAccount();

      // Assert
      expect(account?.address).toBe('0xccc');
      expect(account?.index).toBe(2);
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      // Assert
      expect(integration.isConnected()).toBe(false);
    });

    it('should return true after connecting', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();

      // Assert
      expect(integration.isConnected()).toBe(true);
    });

    it('should return false after disconnecting', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);
      await integration.connect();
      await integration.disconnect();

      // Assert
      expect(integration.isConnected()).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should maintain correct state through connect-disconnect cycle', async () => {
      // Arrange
      integration.connectToProviderMock.mockResolvedValue(mockAccounts);

      // Act & Assert - Connect
      await integration.connect();
      expect(integration.isConnected()).toBe(true);
      expect((await integration.getActiveAccount())?.address).toBe('0xaaa');

      // Act & Assert - Switch
      await integration.switchAccount('0xbbb');
      expect((await integration.getActiveAccount())?.address).toBe('0xbbb');

      // Act & Assert - Disconnect
      await integration.disconnect();
      expect(integration.isConnected()).toBe(false);
      expect(await integration.getActiveAccount()).toBeNull();

      // Act & Assert - Reconnect
      await integration.connect();
      expect(integration.isConnected()).toBe(true);
      expect((await integration.getActiveAccount())?.address).toBe('0xaaa'); // Reset to first
    });
  });
});
