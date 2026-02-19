import { Chain } from '@cygnus-wealth/data-models';
import { v4 as uuidv4 } from 'uuid';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import {
  type WalletProviderId,
  type WalletConnectionId,
  type AccountId,
  type ConnectedAccount,
  type MultiWalletConnection,
  type WatchAddress,
  type AccountGroup,
  type WalletConnectedEvent,
  type WalletDisconnectedEvent,
  type AccountDiscoveredEvent,
  type AccountRemovedEvent,
  type ActiveAccountChangedEvent,
  type ChainChangedEvent,
  type AccountLabelChangedEvent,
  type SessionRestoredEvent,
  type SessionStaleEvent,
  type AddressChainScopeChangedEvent,
  createWalletConnectionId,
  createAccountId,
  createWatchAccountId,
  parseAccountId,
} from '../types/multi-wallet';

interface WalletConnectionEvents {
  walletConnected: WalletConnectedEvent;
  walletDisconnected: WalletDisconnectedEvent;
  accountDiscovered: AccountDiscoveredEvent;
  accountRemoved: AccountRemovedEvent;
  activeAccountChanged: ActiveAccountChangedEvent;
  chainChanged: ChainChangedEvent;
  accountLabelChanged: AccountLabelChangedEvent;
  sessionRestored: SessionRestoredEvent;
  sessionStale: SessionStaleEvent;
  watchAddressAdded: { watchAddress: WatchAddress };
  watchAddressRemoved: { accountId: AccountId };
  accountChainScopeChanged: AddressChainScopeChangedEvent;
}

export interface ConnectWalletOptions {
  providerName: string;
  providerIcon: string;
  supportedChains: Chain[];
  label?: string;
  chainScope?: Chain[];
}

export class WalletConnectionService {
  private connections = new Map<WalletConnectionId, MultiWalletConnection>();
  private watchAddresses = new Map<AccountId, WatchAddress>();
  private accountGroups = new Map<string, AccountGroup>();
  private events = new TypedEventEmitter<WalletConnectionEvents>();

  // --- Connection Lifecycle ---

  connectWallet(
    providerId: WalletProviderId,
    initialAddresses: string[],
    options: ConnectWalletOptions
  ): MultiWalletConnection {
    const connectionId = createWalletConnectionId(providerId);
    const now = new Date().toISOString();
    const chainScope = options.chainScope ?? options.supportedChains;

    const accounts: ConnectedAccount[] = initialAddresses.map((address, index) => ({
      accountId: createAccountId(connectionId, address),
      address,
      accountLabel: this.truncateAddress(address),
      chainScope: [...chainScope],
      source: 'provider' as const,
      discoveredAt: now,
      isStale: false,
      isActive: index === 0,
    }));

    const connection: MultiWalletConnection = {
      connectionId,
      providerId,
      providerName: options.providerName,
      providerIcon: options.providerIcon,
      connectionLabel: options.label ?? options.providerName,
      accounts,
      activeAccountAddress: initialAddresses[0] ?? null,
      supportedChains: [...options.supportedChains],
      connectedAt: now,
      lastActiveAt: now,
      sessionStatus: 'active',
    };

    this.connections.set(connectionId, connection);

    this.events.emit('walletConnected', { connection });
    for (const account of accounts) {
      this.events.emit('accountDiscovered', { connectionId, account });
    }

    return connection;
  }

  disconnectWallet(connectionId: WalletConnectionId): void {
    if (!this.connections.has(connectionId)) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    this.connections.delete(connectionId);
    this.events.emit('walletDisconnected', { connectionId });
  }

  switchChain(connectionId: WalletConnectionId, chainId: Chain): void {
    const connection = this.requireConnection(connectionId);
    connection.lastActiveAt = new Date().toISOString();
    this.events.emit('chainChanged', { connectionId, chainId });
  }

  // --- Account Accumulation ---

  handleAccountsChanged(connectionId: WalletConnectionId, currentAddresses: string[]): void {
    const connection = this.requireConnection(connectionId);
    const now = new Date().toISOString();
    const existingAddresses = new Set(connection.accounts.map(a => a.address));
    const activeAddress = currentAddresses[0] ?? null;

    // Add new accounts (accumulation — never remove)
    for (const address of currentAddresses) {
      if (!existingAddresses.has(address)) {
        const account: ConnectedAccount = {
          accountId: createAccountId(connectionId, address),
          address,
          accountLabel: this.truncateAddress(address),
          chainScope: [...connection.supportedChains],
          source: 'provider',
          discoveredAt: now,
          isStale: false,
          isActive: false,
        };
        connection.accounts.push(account);
        this.events.emit('accountDiscovered', { connectionId, account });
      }
    }

    // Update isActive flags
    for (const account of connection.accounts) {
      account.isActive = account.address === activeAddress;
    }
    connection.activeAccountAddress = activeAddress;
    connection.lastActiveAt = now;

    if (activeAddress) {
      this.events.emit('activeAccountChanged', { connectionId, address: activeAddress });
    }
  }

  // --- Account Management ---

  setConnectionLabel(connectionId: WalletConnectionId, label: string): void {
    const connection = this.requireConnection(connectionId);
    connection.connectionLabel = label;
  }

  setAccountLabel(accountId: AccountId, label: string): void {
    const account = this.findConnectedAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    account.accountLabel = label;
    this.events.emit('accountLabelChanged', { accountId, label });
  }

  setAccountChainScope(accountId: AccountId, chains: Chain[]): void {
    const account = this.findConnectedAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    account.chainScope = [...chains];
    this.events.emit('accountChainScopeChanged', { accountId, chains: [...chains] });
  }

  removeAccount(accountId: AccountId): void {
    const parsed = parseAccountId(accountId);
    if (parsed.isWatch) {
      throw new Error('Use removeWatchAddress for watch addresses');
    }
    const connection = this.connections.get(parsed.walletConnectionId as WalletConnectionId);
    if (!connection) {
      throw new Error(`Connection not found for account: ${accountId}`);
    }
    connection.accounts = connection.accounts.filter(a => a.accountId !== accountId);
    this.events.emit('accountRemoved', { accountId });
  }

  addManualAccountToConnection(connectionId: WalletConnectionId, address: string): ConnectedAccount {
    const connection = this.requireConnection(connectionId);
    const account: ConnectedAccount = {
      accountId: createAccountId(connectionId, address),
      address,
      accountLabel: this.truncateAddress(address),
      chainScope: [...connection.supportedChains],
      source: 'manual',
      discoveredAt: new Date().toISOString(),
      isStale: false,
      isActive: false,
    };
    connection.accounts.push(account);
    this.events.emit('accountDiscovered', { connectionId, account });
    return account;
  }

  // --- Watch Addresses ---

  addWatchAddress(address: string, label: string, chains: Chain[]): WatchAddress {
    const accountId = createWatchAccountId(address);
    const watch: WatchAddress = {
      accountId,
      address,
      addressLabel: label,
      chainScope: [...chains],
      addedAt: new Date().toISOString(),
    };
    this.watchAddresses.set(accountId, watch);
    this.events.emit('watchAddressAdded', { watchAddress: watch });
    return watch;
  }

  removeWatchAddress(accountId: AccountId): void {
    if (!this.watchAddresses.has(accountId)) {
      throw new Error(`Watch address not found: ${accountId}`);
    }
    this.watchAddresses.delete(accountId);
    this.events.emit('watchAddressRemoved', { accountId });
  }

  updateWatchAddress(accountId: AccountId, label?: string, chains?: Chain[]): void {
    const watch = this.watchAddresses.get(accountId);
    if (!watch) {
      throw new Error(`Watch address not found: ${accountId}`);
    }
    if (label !== undefined) watch.addressLabel = label;
    if (chains !== undefined) watch.chainScope = [...chains];
  }

  // --- Account Groups ---

  createAccountGroup(name: string, accountIds: AccountId[]): AccountGroup {
    const groupId = uuidv4();
    const group: AccountGroup = {
      groupId,
      groupName: name,
      accountIds: [...accountIds],
      createdAt: new Date().toISOString(),
    };
    this.accountGroups.set(groupId, group);
    return group;
  }

  updateAccountGroup(groupId: string, name?: string, accountIds?: AccountId[]): void {
    const group = this.accountGroups.get(groupId);
    if (!group) {
      throw new Error(`Account group not found: ${groupId}`);
    }
    if (name !== undefined) group.groupName = name;
    if (accountIds !== undefined) group.accountIds = [...accountIds];
  }

  deleteAccountGroup(groupId: string): void {
    this.accountGroups.delete(groupId);
  }

  // --- Queries ---

  getConnections(): MultiWalletConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(connectionId: WalletConnectionId): MultiWalletConnection {
    return this.requireConnection(connectionId);
  }

  getAccountsByConnection(connectionId: WalletConnectionId): ConnectedAccount[] {
    return this.requireConnection(connectionId).accounts;
  }

  getWatchAddresses(): WatchAddress[] {
    return Array.from(this.watchAddresses.values());
  }

  getAccountGroups(): AccountGroup[] {
    return Array.from(this.accountGroups.values());
  }

  getAllTrackedAccounts(): (ConnectedAccount | WatchAddress)[] {
    const connected: ConnectedAccount[] = [];
    for (const conn of this.connections.values()) {
      connected.push(...conn.accounts);
    }
    const watches = Array.from(this.watchAddresses.values());
    return [...connected, ...watches];
  }

  // --- Session management ---

  markSessionStale(connectionId: WalletConnectionId): void {
    const connection = this.requireConnection(connectionId);
    connection.sessionStatus = 'stale';
    this.events.emit('sessionStale', { connectionId });
  }

  restoreSession(connectionId: WalletConnectionId, providerAddresses: string[]): void {
    const connection = this.requireConnection(connectionId);
    const now = new Date().toISOString();
    const providerSet = new Set(providerAddresses);
    const existingAddresses = new Set(connection.accounts.map(a => a.address));

    // Mark accounts not in provider response as stale
    for (const account of connection.accounts) {
      if (!providerSet.has(account.address)) {
        account.isStale = true;
      } else {
        account.isStale = false;
      }
    }

    // Add new accounts from provider
    for (const address of providerAddresses) {
      if (!existingAddresses.has(address)) {
        const account: ConnectedAccount = {
          accountId: createAccountId(connectionId, address),
          address,
          accountLabel: this.truncateAddress(address),
          chainScope: [...connection.supportedChains],
          source: 'provider',
          discoveredAt: now,
          isStale: false,
          isActive: false,
        };
        connection.accounts.push(account);
      }
    }

    // Update active
    if (providerAddresses.length > 0) {
      for (const account of connection.accounts) {
        account.isActive = account.address === providerAddresses[0];
      }
      connection.activeAccountAddress = providerAddresses[0];
    }

    connection.sessionStatus = 'active';
    connection.lastActiveAt = now;

    this.events.emit('sessionRestored', { connection });
  }

  // --- Event subscriptions ---

  onWalletConnected(handler: (event: WalletConnectedEvent) => void): () => void {
    return this.events.on('walletConnected', handler);
  }

  onWalletDisconnected(handler: (event: WalletDisconnectedEvent) => void): () => void {
    return this.events.on('walletDisconnected', handler);
  }

  onAccountDiscovered(handler: (event: AccountDiscoveredEvent) => void): () => void {
    return this.events.on('accountDiscovered', handler);
  }

  onAccountRemoved(handler: (event: AccountRemovedEvent) => void): () => void {
    return this.events.on('accountRemoved', handler);
  }

  onActiveAccountChanged(handler: (event: ActiveAccountChangedEvent) => void): () => void {
    return this.events.on('activeAccountChanged', handler);
  }

  onChainChanged(handler: (event: ChainChangedEvent) => void): () => void {
    return this.events.on('chainChanged', handler);
  }

  onAccountLabelChanged(handler: (event: AccountLabelChangedEvent) => void): () => void {
    return this.events.on('accountLabelChanged', handler);
  }

  onSessionRestored(handler: (event: SessionRestoredEvent) => void): () => void {
    return this.events.on('sessionRestored', handler);
  }

  onSessionStale(handler: (event: SessionStaleEvent) => void): () => void {
    return this.events.on('sessionStale', handler);
  }

  onWatchAddressAdded(handler: (event: { watchAddress: WatchAddress }) => void): () => void {
    return this.events.on('watchAddressAdded', handler);
  }

  onWatchAddressRemoved(handler: (event: { accountId: AccountId }) => void): () => void {
    return this.events.on('watchAddressRemoved', handler);
  }

  onAccountChainScopeChanged(handler: (event: AddressChainScopeChangedEvent) => void): () => void {
    return this.events.on('accountChainScopeChanged', handler);
  }

  destroy(): void {
    this.events.removeAllListeners();
  }

  // --- Helpers ---

  private requireConnection(connectionId: WalletConnectionId): MultiWalletConnection {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection;
  }

  private findConnectedAccount(accountId: AccountId): ConnectedAccount | undefined {
    for (const connection of this.connections.values()) {
      const found = connection.accounts.find(a => a.accountId === accountId);
      if (found) return found;
    }
    return undefined;
  }

  private truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
