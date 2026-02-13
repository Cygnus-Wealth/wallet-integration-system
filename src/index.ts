// Main exports
export { WalletManager } from './services/WalletManager';

// Chain-specific integrations
export { EVMWalletIntegration } from './chains/evm/EVMWalletIntegration';
export { SolanaWalletIntegration } from './chains/solana/SolanaWalletIntegration';
export { SuiWalletIntegration } from './chains/sui/SuiWalletIntegration';

// Types
export * from './types';

// Config
export * from './config/chain-presets';

// Utils
export * from './utils/constants';

// Re-export commonly used data model types
export { 
  Chain, 
  IntegrationSource
} from '@cygnus-wealth/data-models';