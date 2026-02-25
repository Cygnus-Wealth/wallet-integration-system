import { describe, it, expect } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import {
  type DiscoveredWallet,
  type EIP6963ProviderInfo,
  type WalletStandardProviderInfo,
  type CorrelationEntry,
  type Caip2ChainId,
  CHAIN_FAMILY_VALUES,
  parseCaip2ChainId,
  caip2NamespaceToChainFamily,
  chainFamilyForChain,
} from './types';
import { Chain } from '@cygnus-wealth/data-models';

describe('Discovery Types', () => {
  describe('CHAIN_FAMILY_VALUES', () => {
    it('should contain all ChainFamily enum values', () => {
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.EVM);
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.SOLANA);
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.SUI);
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.BITCOIN);
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.COSMOS);
      expect(CHAIN_FAMILY_VALUES).toContain(ChainFamily.APTOS);
    });
  });

  describe('DiscoveredWallet', () => {
    it('should create a single-chain discovered wallet', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'metamask',
        providerName: 'MetaMask',
        providerIcon: 'metamask-icon.svg',
        supportedChainFamilies: [ChainFamily.EVM],
        isMultiChain: false,
        discoverySource: 'eip6963',
        rdns: 'io.metamask',
      };
      expect(wallet.supportedChainFamilies).toEqual([ChainFamily.EVM]);
      expect(wallet.isMultiChain).toBe(false);
    });

    it('should create a multi-chain discovered wallet', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'phantom',
        providerName: 'Phantom',
        providerIcon: 'phantom-icon.svg',
        supportedChainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.BITCOIN],
        isMultiChain: true,
        discoverySource: 'correlated',
        rdns: 'app.phantom',
      };
      expect(wallet.supportedChainFamilies).toHaveLength(3);
      expect(wallet.isMultiChain).toBe(true);
      expect(wallet.discoverySource).toBe('correlated');
    });

    it('should create a Trust Wallet discovered wallet with all chain families', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'trust-wallet',
        providerName: 'Trust Wallet',
        providerIcon: 'trust-icon.svg',
        supportedChainFamilies: [
          ChainFamily.EVM,
          ChainFamily.SOLANA,
          ChainFamily.COSMOS,
          ChainFamily.APTOS,
        ],
        isMultiChain: true,
        discoverySource: 'correlated',
        rdns: 'com.trustwallet.app',
      };
      expect(wallet.supportedChainFamilies).toHaveLength(4);
    });
  });

  describe('EIP6963ProviderInfo', () => {
    it('should capture EIP-6963 provider details', () => {
      const info: EIP6963ProviderInfo = {
        uuid: 'unique-uuid-123',
        name: 'MetaMask',
        icon: 'data:image/svg+xml,...',
        rdns: 'io.metamask',
      };
      expect(info.rdns).toBe('io.metamask');
      expect(info.uuid).toBeTruthy();
    });
  });

  describe('WalletStandardProviderInfo', () => {
    it('should capture Wallet Standard provider details', () => {
      const info: WalletStandardProviderInfo = {
        name: 'Phantom',
        icon: 'data:image/svg+xml,...',
        chains: ['solana:mainnet'],
        features: ['standard:connect', 'standard:events'],
      };
      expect(info.features).toContain('standard:connect');
    });
  });

  describe('CorrelationEntry', () => {
    it('should map rdns to provider ID', () => {
      const entry: CorrelationEntry = {
        rdns: 'app.phantom',
        providerId: 'phantom',
        chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.BITCOIN],
        walletStandardNames: ['Phantom'],
      };
      expect(entry.providerId).toBe('phantom');
      expect(entry.chainFamilies).toContain(ChainFamily.SOLANA);
    });
  });

  describe('Caip2ChainId', () => {
    it('should parse an EVM CAIP-2 chain ID', () => {
      const parsed = parseCaip2ChainId('eip155:1' as Caip2ChainId);
      expect(parsed.namespace).toBe('eip155');
      expect(parsed.reference).toBe('1');
    });

    it('should parse a Solana CAIP-2 chain ID', () => {
      const parsed = parseCaip2ChainId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as Caip2ChainId);
      expect(parsed.namespace).toBe('solana');
      expect(parsed.reference).toBe('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    });

    it('should parse a Bitcoin CAIP-2 chain ID', () => {
      const parsed = parseCaip2ChainId('bip122:000000000019d6689c085ae165831e93' as Caip2ChainId);
      expect(parsed.namespace).toBe('bip122');
      expect(parsed.reference).toBe('000000000019d6689c085ae165831e93');
    });
  });

  describe('caip2NamespaceToChainFamily', () => {
    it('should map eip155 to EVM', () => {
      expect(caip2NamespaceToChainFamily('eip155')).toBe(ChainFamily.EVM);
    });

    it('should map solana to SOLANA', () => {
      expect(caip2NamespaceToChainFamily('solana')).toBe(ChainFamily.SOLANA);
    });

    it('should map bip122 to BITCOIN', () => {
      expect(caip2NamespaceToChainFamily('bip122')).toBe(ChainFamily.BITCOIN);
    });

    it('should map cosmos to COSMOS', () => {
      expect(caip2NamespaceToChainFamily('cosmos')).toBe(ChainFamily.COSMOS);
    });

    it('should return undefined for unknown namespace', () => {
      expect(caip2NamespaceToChainFamily('unknown')).toBeUndefined();
    });
  });

  describe('chainFamilyForChain', () => {
    it('should return EVM for Ethereum', () => {
      expect(chainFamilyForChain(Chain.ETHEREUM)).toBe(ChainFamily.EVM);
    });

    it('should return EVM for Polygon', () => {
      expect(chainFamilyForChain(Chain.POLYGON)).toBe(ChainFamily.EVM);
    });

    it('should return EVM for Arbitrum', () => {
      expect(chainFamilyForChain(Chain.ARBITRUM)).toBe(ChainFamily.EVM);
    });

    it('should return EVM for BSC', () => {
      expect(chainFamilyForChain(Chain.BSC)).toBe(ChainFamily.EVM);
    });

    it('should return SOLANA for Solana', () => {
      expect(chainFamilyForChain(Chain.SOLANA)).toBe(ChainFamily.SOLANA);
    });

    it('should return SUI for Sui', () => {
      expect(chainFamilyForChain(Chain.SUI)).toBe(ChainFamily.SUI);
    });
  });
});
