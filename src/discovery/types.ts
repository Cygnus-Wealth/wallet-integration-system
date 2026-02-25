import { Chain, ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId } from '../types/multi-wallet';

// --- Chain Family constants ---

export const CHAIN_FAMILY_VALUES: readonly ChainFamily[] = [
  ChainFamily.EVM,
  ChainFamily.SOLANA,
  ChainFamily.SUI,
  ChainFamily.BITCOIN,
  ChainFamily.COSMOS,
  ChainFamily.APTOS,
] as const;

// --- CAIP-2 Chain Identification ---

/** CAIP-2 chain identifier: `{namespace}:{reference}` */
export type Caip2ChainId = string & { readonly __brand: 'Caip2ChainId' };

export function parseCaip2ChainId(id: Caip2ChainId): { namespace: string; reference: string } {
  const colonIdx = id.indexOf(':');
  return {
    namespace: id.slice(0, colonIdx),
    reference: id.slice(colonIdx + 1),
  };
}

const CAIP2_NAMESPACE_MAP: Record<string, ChainFamily> = {
  eip155: ChainFamily.EVM,
  solana: ChainFamily.SOLANA,
  bip122: ChainFamily.BITCOIN,
  cosmos: ChainFamily.COSMOS,
};

export function caip2NamespaceToChainFamily(namespace: string): ChainFamily | undefined {
  return CAIP2_NAMESPACE_MAP[namespace];
}

// --- Chain to ChainFamily mapping ---

const CHAIN_TO_FAMILY: Record<string, ChainFamily> = {
  [Chain.ETHEREUM]: ChainFamily.EVM,
  [Chain.POLYGON]: ChainFamily.EVM,
  [Chain.ARBITRUM]: ChainFamily.EVM,
  [Chain.OPTIMISM]: ChainFamily.EVM,
  [Chain.AVALANCHE]: ChainFamily.EVM,
  [Chain.BSC]: ChainFamily.EVM,
  [Chain.BASE]: ChainFamily.EVM,
  [Chain.SOLANA]: ChainFamily.SOLANA,
  [Chain.SUI]: ChainFamily.SUI,
  [Chain.BITCOIN]: ChainFamily.BITCOIN,
};

export function chainFamilyForChain(chain: Chain): ChainFamily | undefined {
  return CHAIN_TO_FAMILY[chain];
}

// --- EIP-6963 Types ---

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963AnnounceEvent {
  detail: {
    info: EIP6963ProviderInfo;
    provider: unknown;
  };
}

// --- Wallet Standard Types ---

export interface WalletStandardProviderInfo {
  name: string;
  icon: string;
  chains: string[];
  features: string[];
}

export interface WalletStandardWallet {
  name: string;
  icon: string;
  chains: string[];
  features: Record<string, unknown>;
  accounts: unknown[];
}

// --- Provider Correlation ---

export interface CorrelationEntry {
  rdns: string;
  providerId: WalletProviderId;
  chainFamilies: ChainFamily[];
  walletStandardNames: string[];
}

// --- DiscoveredWallet ---

export type DiscoverySource = 'eip6963' | 'wallet-standard' | 'fallback' | 'correlated';

export interface DiscoveredWallet {
  providerId: WalletProviderId;
  providerName: string;
  providerIcon: string;
  supportedChainFamilies: ChainFamily[];
  isMultiChain: boolean;
  discoverySource: DiscoverySource;
  rdns?: string;
}

// --- Discovery Events ---

export interface WalletDiscoveredEvent {
  wallet: DiscoveredWallet;
}

export interface WalletUpdatedEvent {
  wallet: DiscoveredWallet;
}

export interface DiscoveryCompletedEvent {
  wallets: DiscoveredWallet[];
}
