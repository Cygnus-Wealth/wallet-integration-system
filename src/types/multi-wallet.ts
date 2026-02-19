import { Chain } from '@cygnus-wealth/data-models';
import { v4 as uuidv4 } from 'uuid';

// --- Branded string types ---

export type WalletProviderId =
  | 'metamask'
  | 'rabby'
  | 'walletconnect'
  | 'coinbase-wallet'
  | 'trust-wallet'
  | 'frame'
  | 'crypto-com-onchain'
  | 'phantom'
  | 'solflare'
  | 'backpack'
  | 'exodus'
  | 'manual';

export const WALLET_PROVIDER_IDS: readonly WalletProviderId[] = [
  'metamask',
  'rabby',
  'walletconnect',
  'coinbase-wallet',
  'trust-wallet',
  'frame',
  'crypto-com-onchain',
  'phantom',
  'solflare',
  'backpack',
  'exodus',
  'manual',
] as const;

/** Format: `{providerId}:{randomId}` */
export type WalletConnectionId = string & { readonly __brand: 'WalletConnectionId' };

/** Format: `{walletConnectionId}:{checksummedAddress}` or `watch:{checksummedAddress}` */
export type AccountId = string & { readonly __brand: 'AccountId' };

export type SessionStatus = 'active' | 'stale' | 'disconnected';
export type AccountSource = 'provider' | 'manual';

// --- Factory functions ---

export function createWalletConnectionId(providerId: WalletProviderId): WalletConnectionId {
  const randomId = uuidv4().replace(/-/g, '').slice(0, 8);
  return `${providerId}:${randomId}` as WalletConnectionId;
}

export function createAccountId(connectionId: WalletConnectionId, address: string): AccountId {
  return `${connectionId}:${address}` as AccountId;
}

export function createWatchAccountId(address: string): AccountId {
  return `watch:${address}` as AccountId;
}

export function parseWalletConnectionId(id: WalletConnectionId): {
  providerId: WalletProviderId;
  randomId: string;
} {
  const colonIdx = id.indexOf(':');
  return {
    providerId: id.slice(0, colonIdx) as WalletProviderId,
    randomId: id.slice(colonIdx + 1),
  };
}

export function parseAccountId(id: AccountId): {
  walletConnectionId: WalletConnectionId | 'watch';
  address: string;
  isWatch: boolean;
} {
  if (id.startsWith('watch:')) {
    return {
      walletConnectionId: 'watch',
      address: id.slice('watch:'.length),
      isWatch: true,
    };
  }
  // Format: providerId:randomId:address — find last colon for address
  const lastColon = id.lastIndexOf(':');
  return {
    walletConnectionId: id.slice(0, lastColon) as WalletConnectionId,
    address: id.slice(lastColon + 1),
    isWatch: false,
  };
}

// --- Core domain types ---

export interface ConnectedAccount {
  accountId: AccountId;
  address: string;
  accountLabel: string;
  chainScope: Chain[];
  source: AccountSource;
  discoveredAt: string;
  isStale: boolean;
  isActive: boolean;
}

/**
 * A connected wallet provider session.
 * Named MultiWalletConnection to avoid conflict with the existing flat WalletConnection type.
 */
export interface MultiWalletConnection {
  connectionId: WalletConnectionId;
  providerId: WalletProviderId;
  providerName: string;
  providerIcon: string;
  connectionLabel: string;
  accounts: ConnectedAccount[];
  activeAccountAddress: string | null;
  supportedChains: Chain[];
  connectedAt: string;
  lastActiveAt: string;
  sessionStatus: SessionStatus;
}

export interface WatchAddress {
  accountId: AccountId;
  address: string;
  addressLabel: string;
  chainScope: Chain[];
  addedAt: string;
}

export interface AccountGroup {
  groupId: string;
  groupName: string;
  accountIds: AccountId[];
  createdAt: string;
}

// --- Contract types (portfolio-facing) ---

export interface TrackedAddress {
  accountId: AccountId;
  address: string;
  walletConnectionId: WalletConnectionId | 'watch';
  providerId: WalletProviderId | 'watch';
  accountLabel: string;
  connectionLabel: string;
  chainScope: Chain[];
}

export interface AccountMetadata {
  accountId: AccountId;
  address: string;
  accountLabel: string;
  connectionLabel: string;
  providerId: WalletProviderId | 'watch';
  walletConnectionId: WalletConnectionId | 'watch';
  groups: string[];
  discoveredAt: string;
  isStale: boolean;
  isActive: boolean;
}

// --- Event payload types ---

export interface WalletConnectedEvent {
  connection: MultiWalletConnection;
}

export interface WalletDisconnectedEvent {
  connectionId: WalletConnectionId;
}

export interface AccountDiscoveredEvent {
  connectionId: WalletConnectionId;
  account: ConnectedAccount;
}

export interface AccountRemovedEvent {
  accountId: AccountId;
}

export interface ActiveAccountChangedEvent {
  connectionId: WalletConnectionId;
  address: string;
}

export interface ChainChangedEvent {
  connectionId: WalletConnectionId;
  chainId: Chain;
}

export interface AccountLabelChangedEvent {
  accountId: AccountId;
  label: string;
}

export interface SessionRestoredEvent {
  connection: MultiWalletConnection;
}

export interface SessionStaleEvent {
  connectionId: WalletConnectionId;
}

export interface AddressAddedEvent {
  trackedAddress: TrackedAddress;
}

export interface AddressRemovedEvent {
  accountId: AccountId;
}

export interface AddressChainScopeChangedEvent {
  accountId: AccountId;
  chains: Chain[];
}

// --- Connection options ---

export interface ConnectionOptions {
  label?: string;
  chainScope?: Chain[];
}

// --- Provider info ---

export interface WalletProviderInfo {
  providerId: WalletProviderId;
  name: string;
  icon: string;
  isAvailable: boolean;
}
