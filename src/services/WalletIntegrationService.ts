import { Chain } from '@cygnus-wealth/data-models';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import { WalletConnectionService } from './WalletConnectionService';
import {
  type AccountId,
  type WalletConnectionId,
  type TrackedAddress,
  type AccountMetadata,
  type AddressAddedEvent,
  type AddressRemovedEvent,
  type AddressChainScopeChangedEvent,
  parseAccountId,
} from '../types/multi-wallet';

interface IntegrationEvents {
  addressAdded: AddressAddedEvent;
  addressRemoved: AddressRemovedEvent;
  addressChainScopeChanged: AddressChainScopeChangedEvent;
}

export class WalletIntegrationService {
  private events = new TypedEventEmitter<IntegrationEvents>();
  private unsubscribers: (() => void)[] = [];

  constructor(private connectionService: WalletConnectionService) {
    this.wireEvents();
  }

  private wireEvents(): void {
    // Forward accountDiscovered → addressAdded
    this.unsubscribers.push(
      this.connectionService.onAccountDiscovered(({ connectionId, account }) => {
        const connection = this.connectionService.getConnection(connectionId);
        const tracked: TrackedAddress = {
          accountId: account.accountId,
          address: account.address,
          walletConnectionId: connectionId,
          providerId: connection.providerId,
          accountLabel: account.accountLabel,
          connectionLabel: connection.connectionLabel,
          chainScope: account.chainScope,
        };
        this.events.emit('addressAdded', { trackedAddress: tracked });
      })
    );

    // Forward watchAddressAdded → addressAdded
    this.unsubscribers.push(
      this.connectionService.onWatchAddressAdded(({ watchAddress }) => {
        const tracked: TrackedAddress = {
          accountId: watchAddress.accountId,
          address: watchAddress.address,
          walletConnectionId: 'watch',
          providerId: 'watch',
          accountLabel: watchAddress.addressLabel,
          connectionLabel: '',
          chainScope: watchAddress.chainScope,
        };
        this.events.emit('addressAdded', { trackedAddress: tracked });
      })
    );

    // Forward accountRemoved → addressRemoved
    this.unsubscribers.push(
      this.connectionService.onAccountRemoved(({ accountId }) => {
        this.events.emit('addressRemoved', { accountId });
      })
    );

    // Forward watchAddressRemoved → addressRemoved
    this.unsubscribers.push(
      this.connectionService.onWatchAddressRemoved(({ accountId }) => {
        this.events.emit('addressRemoved', { accountId });
      })
    );

    // Forward accountChainScopeChanged → addressChainScopeChanged
    this.unsubscribers.push(
      this.connectionService.onAccountChainScopeChanged(({ accountId, chains }) => {
        this.events.emit('addressChainScopeChanged', { accountId, chains });
      })
    );
  }

  // --- Queries ---

  getTrackedAddresses(): TrackedAddress[] {
    const result: TrackedAddress[] = [];

    for (const connection of this.connectionService.getConnections()) {
      for (const account of connection.accounts) {
        result.push({
          accountId: account.accountId,
          address: account.address,
          walletConnectionId: connection.connectionId,
          providerId: connection.providerId,
          accountLabel: account.accountLabel,
          connectionLabel: connection.connectionLabel,
          chainScope: account.chainScope,
        });
      }
    }

    for (const watch of this.connectionService.getWatchAddresses()) {
      result.push({
        accountId: watch.accountId,
        address: watch.address,
        walletConnectionId: 'watch',
        providerId: 'watch',
        accountLabel: watch.addressLabel,
        connectionLabel: '',
        chainScope: watch.chainScope,
      });
    }

    return result;
  }

  getTrackedAddressesByChain(chain: Chain): TrackedAddress[] {
    return this.getTrackedAddresses().filter(t => t.chainScope.includes(chain));
  }

  getTrackedAddressesByWallet(connectionId: WalletConnectionId): TrackedAddress[] {
    return this.getTrackedAddresses().filter(t => t.walletConnectionId === connectionId);
  }

  getTrackedAddressesByGroup(groupId: string): TrackedAddress[] {
    const groups = this.connectionService.getAccountGroups();
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return [];

    const accountIdSet = new Set<AccountId>(group.accountIds);
    return this.getTrackedAddresses().filter(t => accountIdSet.has(t.accountId));
  }

  getAccountMetadata(accountId: AccountId): AccountMetadata {
    const parsed = parseAccountId(accountId);

    // Check watch addresses
    if (parsed.isWatch) {
      const watches = this.connectionService.getWatchAddresses();
      const watch = watches.find(w => w.accountId === accountId);
      if (!watch) throw new Error(`Account not found: ${accountId}`);

      return {
        accountId,
        address: watch.address,
        accountLabel: watch.addressLabel,
        connectionLabel: '',
        providerId: 'watch',
        walletConnectionId: 'watch',
        groups: this.getGroupsForAccount(accountId),
        discoveredAt: watch.addedAt,
        isStale: false,
        isActive: false,
      };
    }

    // Check connected accounts
    for (const connection of this.connectionService.getConnections()) {
      const account = connection.accounts.find(a => a.accountId === accountId);
      if (account) {
        return {
          accountId,
          address: account.address,
          accountLabel: account.accountLabel,
          connectionLabel: connection.connectionLabel,
          providerId: connection.providerId,
          walletConnectionId: connection.connectionId,
          groups: this.getGroupsForAccount(accountId),
          discoveredAt: account.discoveredAt,
          isStale: account.isStale,
          isActive: account.isActive,
        };
      }
    }

    throw new Error(`Account not found: ${accountId}`);
  }

  // --- Events ---

  onAddressAdded(handler: (event: AddressAddedEvent) => void): () => void {
    return this.events.on('addressAdded', handler);
  }

  onAddressRemoved(handler: (event: AddressRemovedEvent) => void): () => void {
    return this.events.on('addressRemoved', handler);
  }

  onAddressChainScopeChanged(handler: (event: AddressChainScopeChangedEvent) => void): () => void {
    return this.events.on('addressChainScopeChanged', handler);
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.events.removeAllListeners();
  }

  // --- Helpers ---

  private getGroupsForAccount(accountId: AccountId): string[] {
    return this.connectionService
      .getAccountGroups()
      .filter(g => g.accountIds.includes(accountId))
      .map(g => g.groupId);
  }
}
