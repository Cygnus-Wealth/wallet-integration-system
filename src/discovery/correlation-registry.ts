import { ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId } from '@cygnus-wealth/data-models';

export interface WalletCorrelation {
  providerId: WalletProviderId;
  name: string;
  chainFamilies: ChainFamily[];
  rdnsPatterns?: string[];
  namePatterns?: string[];
}

export const WALLET_CORRELATIONS: WalletCorrelation[] = [
  {
    providerId: 'metamask',
    name: 'MetaMask',
    chainFamilies: [ChainFamily.EVM],
    rdnsPatterns: ['io.metamask', 'io.metamask.flask'],
    namePatterns: ['metamask'],
  },
  {
    providerId: 'phantom',
    name: 'Phantom',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.BITCOIN],
    rdnsPatterns: ['app.phantom'],
    namePatterns: ['phantom'],
  },
  {
    providerId: 'trust-wallet',
    name: 'Trust Wallet',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.COSMOS, ChainFamily.APTOS],
    rdnsPatterns: ['com.trustwallet.app'],
    namePatterns: ['trust wallet', 'trust'],
  },
  {
    providerId: 'backpack',
    name: 'Backpack',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
    rdnsPatterns: ['app.backpack'],
    namePatterns: ['backpack'],
  },
  {
    providerId: 'rabby',
    name: 'Rabby',
    chainFamilies: [ChainFamily.EVM],
    rdnsPatterns: ['io.rabby'],
    namePatterns: ['rabby'],
  },
  {
    providerId: 'coinbase-wallet',
    name: 'Coinbase Wallet',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
    rdnsPatterns: ['com.coinbase.wallet'],
    namePatterns: ['coinbase wallet', 'coinbase'],
  },
  {
    providerId: 'exodus',
    name: 'Exodus',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
    rdnsPatterns: ['com.exodus.web3'],
    namePatterns: ['exodus'],
  },
  {
    providerId: 'frame',
    name: 'Frame',
    chainFamilies: [ChainFamily.EVM],
    rdnsPatterns: ['sh.frame'],
    namePatterns: ['frame'],
  },
  {
    providerId: 'crypto-com-onchain',
    name: 'Crypto.com Onchain',
    chainFamilies: [ChainFamily.EVM],
    rdnsPatterns: ['com.crypto.wallet'],
    namePatterns: ['crypto.com'],
  },
  {
    providerId: 'solflare',
    name: 'Solflare',
    chainFamilies: [ChainFamily.SOLANA],
    rdnsPatterns: [],
    namePatterns: ['solflare'],
  },
  {
    providerId: 'walletconnect',
    name: 'WalletConnect',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.COSMOS],
    rdnsPatterns: [],
    namePatterns: ['walletconnect'],
  },
];

export const CAIP2_NAMESPACE_TO_CHAIN_FAMILY: Record<string, ChainFamily> = {
  eip155: ChainFamily.EVM,
  solana: ChainFamily.SOLANA,
  bip122: ChainFamily.BITCOIN,
  cosmos: ChainFamily.COSMOS,
};

export function getCorrelationByRdns(rdns: string): WalletCorrelation | undefined {
  return WALLET_CORRELATIONS.find(c =>
    c.rdnsPatterns?.some(pattern => rdns === pattern)
  );
}

export function getCorrelationByName(name: string): WalletCorrelation | undefined {
  const lower = name.toLowerCase();
  return WALLET_CORRELATIONS.find(c =>
    c.namePatterns?.some(pattern => lower.includes(pattern))
  );
}

export function getCorrelationByProviderId(providerId: WalletProviderId): WalletCorrelation | undefined {
  return WALLET_CORRELATIONS.find(c => c.providerId === providerId);
}

export function chainFamilyFromCaip2Namespace(namespace: string): ChainFamily | undefined {
  return CAIP2_NAMESPACE_TO_CHAIN_FAMILY[namespace];
}
