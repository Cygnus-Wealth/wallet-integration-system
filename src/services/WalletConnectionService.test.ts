import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chain } from '@cygnus-wealth/data-models';
import { WalletConnectionService } from './WalletConnectionService';
import type {
  WalletProviderId,
  WalletConnectionId,
  AccountId,
  ConnectedAccount,
  MultiWalletConnection,
  WatchAddress,
  AccountGroup,
} from '../types/multi-wallet';

describe('WalletConnectionService', () => {
  let service: WalletConnectionService;

  beforeEach(() => {
    service = new WalletConnectionService();
  });

  // --- Connection Lifecycle ---

  describe('connectWallet', () => {
    it('should create a new connection with initial accounts', () => {
      const addresses = ['0x1234567890123456789012345678901234567890'];
      const connection = service.connectWallet('metamask', addresses, {
        providerName: 'MetaMask',
        providerIcon: 'metamask-icon',
        supportedChains: [Chain.ETHEREUM, Chain.POLYGON],
      });

      expect(connection.connectionId).toMatch(/^metamask:/);
      expect(connection.providerId).toBe('metamask');
      expect(connection.providerName).toBe('MetaMask');
      expect(connection.accounts).toHaveLength(1);
      expect(connection.accounts[0].address).toBe('0x1234567890123456789012345678901234567890');
      expect(connection.accounts[0].source).toBe('provider');
      expect(connection.accounts[0].isActive).toBe(true);
      expect(connection.sessionStatus).toBe('active');
      expect(connection.activeAccountAddress).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should create connection with multiple initial accounts (e.g. Rabby)', () => {
      const addresses = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];
      const connection = service.connectWallet('rabby', addresses, {
        providerName: 'Rabby',
        providerIcon: 'rabby-icon',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(connection.accounts).toHaveLength(3);
      expect(connection.accounts[0].isActive).toBe(true);
      expect(connection.accounts[1].isActive).toBe(false);
      expect(connection.accounts[2].isActive).toBe(false);
    });

    it('should emit onWalletConnected event', () => {
      const handler = vi.fn();
      service.onWalletConnected(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(handler).toHaveBeenCalledWith({ connection });
    });

    it('should emit onAccountDiscovered for each initial account', () => {
      const handler = vi.fn();
      service.onAccountDiscovered(handler);

      service.connectWallet('rabby', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'Rabby',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should apply custom connection label from options', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
        label: 'My Hardware Wallet',
      });

      expect(connection.connectionLabel).toBe('My Hardware Wallet');
    });

    it('should default connection label to provider name', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(connection.connectionLabel).toBe('MetaMask');
    });
  });

  describe('disconnectWallet', () => {
    it('should remove the connection', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.disconnectWallet(connection.connectionId);
      expect(service.getConnections()).toHaveLength(0);
    });

    it('should emit onWalletDisconnected event', () => {
      const handler = vi.fn();
      service.onWalletDisconnected(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      service.disconnectWallet(connection.connectionId);

      expect(handler).toHaveBeenCalledWith({ connectionId: connection.connectionId });
    });

    it('should throw on invalid connection ID', () => {
      expect(() => service.disconnectWallet('invalid:id' as WalletConnectionId))
        .toThrow();
    });
  });

  // --- Account Accumulation ---

  describe('handleAccountsChanged (accumulation model)', () => {
    it('should add new accounts when provider reports them', () => {
      const connection = service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.handleAccountsChanged(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
      ]);

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts).toHaveLength(2);
    });

    it('should update isActive flags on account switch', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      // Simulate user switching to account 2 in MetaMask
      service.handleAccountsChanged(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
      ]);

      const updated = service.getConnection(connection.connectionId);
      const account1 = updated.accounts.find(a => a.address === '0x1111111111111111111111111111111111111111');
      const account2 = updated.accounts.find(a => a.address === '0x2222222222222222222222222222222222222222');
      expect(account1!.isActive).toBe(false);
      expect(account2!.isActive).toBe(true);
      expect(updated.activeAccountAddress).toBe('0x2222222222222222222222222222222222222222');
    });

    it('should emit onAccountDiscovered for new accounts', () => {
      const handler = vi.fn();
      service.onAccountDiscovered(handler);

      const connection = service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      handler.mockClear(); // Clear events from initial connection

      service.handleAccountsChanged(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        connectionId: connection.connectionId,
        account: expect.objectContaining({
          address: '0x2222222222222222222222222222222222222222',
        }),
      }));
    });

    it('should emit onActiveAccountChanged', () => {
      const handler = vi.fn();
      service.onActiveAccountChanged(handler);

      const connection = service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.handleAccountsChanged(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
      ]);

      expect(handler).toHaveBeenCalledWith({
        connectionId: connection.connectionId,
        address: '0x2222222222222222222222222222222222222222',
      });
    });

    it('should never remove accounts on accountsChanged (accumulation only)', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      // Provider now only reports one account (user switched)
      service.handleAccountsChanged(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
      ]);

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts).toHaveLength(3); // All 3 still tracked
    });
  });

  // --- Account Management ---

  describe('setConnectionLabel', () => {
    it('should update connection label', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.setConnectionLabel(connection.connectionId, 'My Primary Wallet');
      const updated = service.getConnection(connection.connectionId);
      expect(updated.connectionLabel).toBe('My Primary Wallet');
    });
  });

  describe('setAccountLabel', () => {
    it('should update account label', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const accountId = connection.accounts[0].accountId;
      service.setAccountLabel(accountId, 'Cold Storage');

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts[0].accountLabel).toBe('Cold Storage');
    });

    it('should emit onAccountLabelChanged event', () => {
      const handler = vi.fn();
      service.onAccountLabelChanged(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const accountId = connection.accounts[0].accountId;
      service.setAccountLabel(accountId, 'Cold Storage');

      expect(handler).toHaveBeenCalledWith({ accountId, label: 'Cold Storage' });
    });
  });

  describe('setAccountChainScope', () => {
    it('should update chain scope for an account', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM, Chain.POLYGON, Chain.ARBITRUM],
      });

      const accountId = connection.accounts[0].accountId;
      service.setAccountChainScope(accountId, [Chain.ETHEREUM]);

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts[0].chainScope).toEqual([Chain.ETHEREUM]);
    });
  });

  describe('removeAccount', () => {
    it('should remove an account from a connection', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.removeAccount(connection.accounts[0].accountId);

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts).toHaveLength(1);
      expect(updated.accounts[0].address).toBe('0x2222222222222222222222222222222222222222');
    });

    it('should emit onAccountRemoved', () => {
      const handler = vi.fn();
      service.onAccountRemoved(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const accountId = connection.accounts[0].accountId;
      service.removeAccount(accountId);

      expect(handler).toHaveBeenCalledWith({ accountId });
    });
  });

  describe('addManualAccountToConnection', () => {
    it('should add a manual account to an existing connection', () => {
      const connection = service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const account = service.addManualAccountToConnection(
        connection.connectionId,
        '0x9999999999999999999999999999999999999999'
      );

      expect(account.source).toBe('manual');
      expect(account.address).toBe('0x9999999999999999999999999999999999999999');

      const updated = service.getConnection(connection.connectionId);
      expect(updated.accounts).toHaveLength(2);
    });
  });

  // --- Watch Addresses ---

  describe('addWatchAddress', () => {
    it('should add a watch address', () => {
      const watch = service.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Vitalik',
        [Chain.ETHEREUM]
      );

      expect(watch.accountId).toMatch(/^watch:/);
      expect(watch.addressLabel).toBe('Vitalik');
      expect(watch.chainScope).toEqual([Chain.ETHEREUM]);
    });
  });

  describe('removeWatchAddress', () => {
    it('should remove a watch address', () => {
      const watch = service.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Vitalik',
        [Chain.ETHEREUM]
      );

      service.removeWatchAddress(watch.accountId);
      expect(service.getWatchAddresses()).toHaveLength(0);
    });
  });

  describe('updateWatchAddress', () => {
    it('should update watch address label and chain scope', () => {
      const watch = service.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Vitalik',
        [Chain.ETHEREUM]
      );

      service.updateWatchAddress(watch.accountId, 'Updated Label', [Chain.ETHEREUM, Chain.POLYGON]);

      const updated = service.getWatchAddresses();
      expect(updated[0].addressLabel).toBe('Updated Label');
      expect(updated[0].chainScope).toEqual([Chain.ETHEREUM, Chain.POLYGON]);
    });
  });

  // --- Account Groups ---

  describe('createAccountGroup', () => {
    it('should create an account group', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const group = service.createAccountGroup('DeFi Accounts', [connection.accounts[0].accountId]);

      expect(group.groupName).toBe('DeFi Accounts');
      expect(group.accountIds).toHaveLength(1);
      expect(group.groupId).toBeTruthy();
    });
  });

  describe('updateAccountGroup', () => {
    it('should update group name and members', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const group = service.createAccountGroup('DeFi', [connection.accounts[0].accountId]);
      service.updateAccountGroup(group.groupId, 'DeFi & Yield', [
        connection.accounts[0].accountId,
        connection.accounts[1].accountId,
      ]);

      const groups = service.getAccountGroups();
      expect(groups[0].groupName).toBe('DeFi & Yield');
      expect(groups[0].accountIds).toHaveLength(2);
    });
  });

  describe('deleteAccountGroup', () => {
    it('should delete an account group', () => {
      const group = service.createAccountGroup('Test Group', []);
      service.deleteAccountGroup(group.groupId);
      expect(service.getAccountGroups()).toHaveLength(0);
    });
  });

  // --- Queries ---

  describe('getConnections', () => {
    it('should return all connections', () => {
      service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      service.connectWallet('rabby', ['0x2222222222222222222222222222222222222222'], {
        providerName: 'Rabby',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(service.getConnections()).toHaveLength(2);
    });
  });

  describe('getConnection', () => {
    it('should return a specific connection', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const fetched = service.getConnection(connection.connectionId);
      expect(fetched.connectionId).toBe(connection.connectionId);
    });

    it('should throw for unknown connection', () => {
      expect(() => service.getConnection('unknown:id' as WalletConnectionId))
        .toThrow();
    });
  });

  describe('getAccountsByConnection', () => {
    it('should return accounts for a specific connection', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      const accounts = service.getAccountsByConnection(connection.connectionId);
      expect(accounts).toHaveLength(2);
    });
  });

  describe('getAllTrackedAccounts', () => {
    it('should return all connected accounts and watch addresses', () => {
      service.connectWallet('metamask', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      service.addWatchAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'Watch', [Chain.ETHEREUM]);

      const all = service.getAllTrackedAccounts();
      expect(all).toHaveLength(2);
    });
  });

  // --- Session management ---

  describe('markSessionStale', () => {
    it('should mark a connection as stale', () => {
      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      service.markSessionStale(connection.connectionId);
      const updated = service.getConnection(connection.connectionId);
      expect(updated.sessionStatus).toBe('stale');
    });

    it('should emit onSessionStale event', () => {
      const handler = vi.fn();
      service.onSessionStale(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      service.markSessionStale(connection.connectionId);

      expect(handler).toHaveBeenCalledWith({ connectionId: connection.connectionId });
    });
  });

  describe('restoreSession', () => {
    it('should restore a connection with merged accounts', () => {
      const connection = service.connectWallet('metamask', [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      // Simulate session restore where provider returns different accounts
      service.restoreSession(connection.connectionId, [
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ]);

      const updated = service.getConnection(connection.connectionId);
      // Should have all 3: original 2 + 1 new
      expect(updated.accounts).toHaveLength(3);
      // Account 1 should be stale (not returned by provider)
      const account1 = updated.accounts.find(a => a.address === '0x1111111111111111111111111111111111111111');
      expect(account1!.isStale).toBe(true);
      // Account 3 is new
      const account3 = updated.accounts.find(a => a.address === '0x3333333333333333333333333333333333333333');
      expect(account3).toBeDefined();
      expect(account3!.isStale).toBe(false);
      expect(updated.sessionStatus).toBe('active');
    });

    it('should emit onSessionRestored', () => {
      const handler = vi.fn();
      service.onSessionRestored(handler);

      const connection = service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      service.restoreSession(connection.connectionId, ['0x1234567890123456789012345678901234567890']);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        connection: expect.objectContaining({
          connectionId: connection.connectionId,
        }),
      }));
    });
  });

  // --- Same address in multiple connections ---

  describe('multi-provider conflict resolution', () => {
    it('should allow the same address in different connections with distinct AccountIds', () => {
      const sharedAddress = '0x1111111111111111111111111111111111111111';

      const mm = service.connectWallet('metamask', [sharedAddress], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });
      const rabby = service.connectWallet('rabby', [sharedAddress], {
        providerName: 'Rabby',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(mm.accounts[0].accountId).not.toBe(rabby.accounts[0].accountId);
      expect(mm.accounts[0].address).toBe(rabby.accounts[0].address);
    });
  });

  // --- Cleanup ---

  describe('destroy', () => {
    it('should remove all event listeners', () => {
      const handler = vi.fn();
      service.onWalletConnected(handler);
      service.destroy();

      service.connectWallet('metamask', ['0x1234567890123456789012345678901234567890'], {
        providerName: 'MetaMask',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
