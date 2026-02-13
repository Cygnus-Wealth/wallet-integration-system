import { Chain } from '@cygnus-wealth/data-models';
import { ChainConfig, NetworkEnvironment } from '../types';

const PRODUCTION_CHAINS: Partial<Record<Chain, ChainConfig>> = {
  [Chain.ETHEREUM]: {
    chain: Chain.ETHEREUM,
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io'
  },
  [Chain.BSC]: {
    chain: Chain.BSC,
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrl: 'https://bscscan.com'
  },
  [Chain.POLYGON]: {
    chain: Chain.POLYGON,
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com'
  },
  [Chain.ARBITRUM]: {
    chain: Chain.ARBITRUM,
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io'
  },
  [Chain.OPTIMISM]: {
    chain: Chain.OPTIMISM,
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://optimistic.etherscan.io'
  },
  [Chain.AVALANCHE]: {
    chain: Chain.AVALANCHE,
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorerUrl: 'https://snowtrace.io'
  },
  [Chain.BASE]: {
    chain: Chain.BASE,
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://basescan.org'
  },
  [Chain.SOLANA]: {
    chain: Chain.SOLANA,
    chainId: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorerUrl: 'https://explorer.solana.com'
  },
  [Chain.SUI]: {
    chain: Chain.SUI,
    chainId: 'mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io',
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    blockExplorerUrl: 'https://suiexplorer.com'
  }
};

const TESTNET_CHAINS: Partial<Record<Chain, ChainConfig>> = {
  [Chain.ETHEREUM]: {
    chain: Chain.ETHEREUM,
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.etherscan.io'
  },
  [Chain.BSC]: {
    chain: Chain.BSC,
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    blockExplorerUrl: 'https://testnet.bscscan.com'
  },
  [Chain.POLYGON]: {
    chain: Chain.POLYGON,
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://amoy.polygonscan.com'
  },
  [Chain.ARBITRUM]: {
    chain: Chain.ARBITRUM,
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.arbiscan.io'
  },
  [Chain.OPTIMISM]: {
    chain: Chain.OPTIMISM,
    chainId: 11155420,
    rpcUrl: 'https://sepolia.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io'
  },
  [Chain.AVALANCHE]: {
    chain: Chain.AVALANCHE,
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockExplorerUrl: 'https://testnet.snowtrace.io'
  },
  [Chain.BASE]: {
    chain: Chain.BASE,
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.basescan.org'
  },
  [Chain.SOLANA]: {
    chain: Chain.SOLANA,
    chainId: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorerUrl: 'https://explorer.solana.com/?cluster=devnet'
  },
  [Chain.SUI]: {
    chain: Chain.SUI,
    chainId: 'testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io',
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    blockExplorerUrl: 'https://suiexplorer.com/?network=testnet'
  }
};

const LOCAL_CHAINS: Partial<Record<Chain, ChainConfig>> = {
  [Chain.ETHEREUM]: {
    chain: Chain.ETHEREUM,
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: undefined
  },
  [Chain.SOLANA]: {
    chain: Chain.SOLANA,
    chainId: 'localnet',
    rpcUrl: 'http://localhost:8899',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockExplorerUrl: undefined
  },
  [Chain.SUI]: {
    chain: Chain.SUI,
    chainId: 'localnet',
    rpcUrl: 'http://localhost:9000',
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    blockExplorerUrl: undefined
  }
};

const CHAIN_PRESETS: Record<NetworkEnvironment, Partial<Record<Chain, ChainConfig>>> = {
  [NetworkEnvironment.PRODUCTION]: PRODUCTION_CHAINS,
  [NetworkEnvironment.TESTNET]: TESTNET_CHAINS,
  [NetworkEnvironment.LOCAL]: LOCAL_CHAINS
};

export function getChainConfigs(
  environment: NetworkEnvironment = NetworkEnvironment.PRODUCTION
): Partial<Record<Chain, ChainConfig>> {
  return CHAIN_PRESETS[environment];
}

export function getChainConfig(
  chain: Chain,
  environment: NetworkEnvironment = NetworkEnvironment.PRODUCTION
): ChainConfig | undefined {
  return CHAIN_PRESETS[environment][chain];
}

export { CHAIN_PRESETS };
