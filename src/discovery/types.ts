import { ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId, WalletConnectionId } from '@cygnus-wealth/data-models';

export interface DiscoveredProvider {
  chainFamily: ChainFamily;
  name: string;
  icon: string;
  provider: unknown;
  rdns?: string;
  uuid?: string;
  isFallback?: boolean;
}

export interface DiscoveredWallet {
  providerId: WalletProviderId | string;
  name: string;
  icon: string;
  supportedChainFamilies: ChainFamily[];
  isMultiChain: boolean;
  providers: Map<ChainFamily, DiscoveredProvider>;
}

export interface DiscoveryCompleteEvent {
  wallets: DiscoveredWallet[];
  timestamp: string;
}

export interface ChainFamilyConnectionChangedEvent {
  connectionId: WalletConnectionId;
  chainFamily: ChainFamily;
  action: 'added' | 'removed';
}

export type DiscoveryEvent =
  | { type: 'discoveryComplete'; payload: DiscoveryCompleteEvent }
  | { type: 'chainFamilyConnectionChanged'; payload: ChainFamilyConnectionChangedEvent };
