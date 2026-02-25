// Main exports
export { WalletManager } from './services/WalletManager';
export { WalletConnectionService } from './services/WalletConnectionService';
export type { ConnectWalletOptions, ConnectChainFamilyOptions } from './services/WalletConnectionService';
export { WalletIntegrationService } from './services/WalletIntegrationService';

// Chain-specific integrations
export { EVMWalletIntegration } from './chains/evm/EVMWalletIntegration';
export { CryptoComWalletIntegration } from './chains/evm/CryptoComWalletIntegration';
export { TrustWalletIntegration, TRUST_WALLET_SOURCE } from './chains/evm/TrustWalletIntegration';
export { SolanaWalletIntegration } from './chains/solana/SolanaWalletIntegration';
export { SuiWalletIntegration } from './chains/sui/SuiWalletIntegration';

// Types
export * from './types';

// Discovery (en-o8w)
export { WalletDiscoveryService } from './discovery/WalletDiscoveryService';
export * from './discovery/types';

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