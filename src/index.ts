// Main exports
export { WalletManager } from './services/WalletManager';
export { WalletConnectionService } from './services/WalletConnectionService';
export type { ConnectWalletOptions } from './services/WalletConnectionService';
export { WalletIntegrationService } from './services/WalletIntegrationService';

// Chain-specific integrations
export { EVMWalletIntegration } from './chains/evm/EVMWalletIntegration';
export { CryptoComWalletIntegration } from './chains/evm/CryptoComWalletIntegration';
export { TrustWalletIntegration, TRUST_WALLET_SOURCE } from './chains/evm/TrustWalletIntegration';
export { SolanaWalletIntegration } from './chains/solana/SolanaWalletIntegration';
export { SuiWalletIntegration } from './chains/sui/SuiWalletIntegration';

// Discovery (en-o8w)
export { WalletDiscoveryService } from './discovery/WalletDiscoveryService';
export { ProviderCorrelationService } from './discovery/ProviderCorrelationService';
export { Eip6963Discovery } from './discovery/Eip6963Discovery';
export { WalletStandardDiscovery } from './discovery/WalletStandardDiscovery';
export { GlobalInjectionDiscovery } from './discovery/GlobalInjectionDiscovery';
export type {
  DiscoveredProvider,
  DiscoveredWallet,
  DiscoveryCompleteEvent,
  ChainFamilyConnectionChangedEvent as DiscoveryChainFamilyConnectionChangedEvent,
} from './discovery/types';
export {
  WALLET_CORRELATIONS,
  CAIP2_NAMESPACE_TO_CHAIN_FAMILY,
  getCorrelationByRdns,
  getCorrelationByName,
  getCorrelationByProviderId,
  chainFamilyFromCaip2Namespace,
} from './discovery/correlation-registry';

// Types
export * from './types';

// Config
export * from './config/chain-presets';

// Utils
export * from './utils/constants';

// Re-export commonly used data model types
export {
  Chain,
  ChainFamily,
  IntegrationSource
} from '@cygnus-wealth/data-models';