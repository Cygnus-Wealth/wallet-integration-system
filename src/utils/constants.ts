import { Chain } from '@cygnus-wealth/data-models';
import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Partial<Record<Chain, ChainConfig>> = {
  [Chain.ETHEREUM]: {
    chain: Chain.ETHEREUM,
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://etherscan.io'
  },
  [Chain.BSC]: {
    chain: Chain.BSC,
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrl: 'https://bscscan.com'
  },
  [Chain.POLYGON]: {
    chain: Chain.POLYGON,
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrl: 'https://polygonscan.com'
  },
  [Chain.ARBITRUM]: {
    chain: Chain.ARBITRUM,
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://arbiscan.io'
  },
  [Chain.OPTIMISM]: {
    chain: Chain.OPTIMISM,
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://optimistic.etherscan.io'
  },
  [Chain.AVALANCHE]: {
    chain: Chain.AVALANCHE,
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorerUrl: 'https://snowtrace.io'
  },
  [Chain.BASE]: {
    chain: Chain.BASE,
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://basescan.org'
  },
  [Chain.SOLANA]: {
    chain: Chain.SOLANA,
    chainId: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9
    },
    blockExplorerUrl: 'https://explorer.solana.com'
  },
  [Chain.SUI]: {
    chain: Chain.SUI,
    chainId: 'mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io',
    nativeCurrency: {
      name: 'SUI',
      symbol: 'SUI',
      decimals: 9
    },
    blockExplorerUrl: 'https://suiexplorer.com'
  }
};

export const EVM_CHAINS = [
  Chain.ETHEREUM,
  Chain.BSC,
  Chain.POLYGON,
  Chain.ARBITRUM,
  Chain.OPTIMISM,
  Chain.AVALANCHE,
  Chain.BASE
];

export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const DEFAULT_TOKEN_LISTS = {
  [Chain.ETHEREUM]: 'https://tokens.coingecko.com/uniswap/all.json',
  [Chain.BSC]: 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
  [Chain.POLYGON]: 'https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json',
  [Chain.ARBITRUM]: 'https://bridge.arbitrum.io/token-list-42161.json',
  [Chain.OPTIMISM]: 'https://static.optimism.io/optimism.tokenlist.json',
  [Chain.AVALANCHE]: 'https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/main/joe.tokenlist.json',
  [Chain.BASE]: 'https://tokens.coingecko.com/base/all.json'
};