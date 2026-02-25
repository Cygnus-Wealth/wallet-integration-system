import { describe, it, expect } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import {
  WALLET_CORRELATIONS,
  getCorrelationByRdns,
  getCorrelationByName,
  getCorrelationByProviderId,
  CAIP2_NAMESPACE_TO_CHAIN_FAMILY,
  chainFamilyFromCaip2Namespace,
} from './correlation-registry';

describe('Correlation Registry', () => {
  describe('WALLET_CORRELATIONS', () => {
    it('should contain Phantom correlation entry', () => {
      const phantom = WALLET_CORRELATIONS.find(c => c.providerId === 'phantom');
      expect(phantom).toBeDefined();
      expect(phantom!.chainFamilies).toContain(ChainFamily.EVM);
      expect(phantom!.chainFamilies).toContain(ChainFamily.SOLANA);
    });

    it('should contain Trust Wallet correlation entry', () => {
      const trust = WALLET_CORRELATIONS.find(c => c.providerId === 'trust-wallet');
      expect(trust).toBeDefined();
      expect(trust!.chainFamilies).toContain(ChainFamily.EVM);
      expect(trust!.chainFamilies).toContain(ChainFamily.SOLANA);
      expect(trust!.chainFamilies).toContain(ChainFamily.COSMOS);
      expect(trust!.chainFamilies).toContain(ChainFamily.APTOS);
    });

    it('should contain MetaMask as EVM-only', () => {
      const mm = WALLET_CORRELATIONS.find(c => c.providerId === 'metamask');
      expect(mm).toBeDefined();
      expect(mm!.chainFamilies).toEqual([ChainFamily.EVM]);
    });

    it('should contain Backpack correlation entry', () => {
      const backpack = WALLET_CORRELATIONS.find(c => c.providerId === 'backpack');
      expect(backpack).toBeDefined();
      expect(backpack!.chainFamilies).toContain(ChainFamily.EVM);
      expect(backpack!.chainFamilies).toContain(ChainFamily.SOLANA);
    });

    it('should have RDNS entries for EVM wallets', () => {
      const phantom = WALLET_CORRELATIONS.find(c => c.providerId === 'phantom');
      expect(phantom!.rdnsPatterns).toBeDefined();
      expect(phantom!.rdnsPatterns!.length).toBeGreaterThan(0);
    });

    it('should have name patterns for matching', () => {
      const phantom = WALLET_CORRELATIONS.find(c => c.providerId === 'phantom');
      expect(phantom!.namePatterns).toBeDefined();
      expect(phantom!.namePatterns!.length).toBeGreaterThan(0);
    });
  });

  describe('getCorrelationByRdns', () => {
    it('should find Phantom by RDNS', () => {
      const result = getCorrelationByRdns('app.phantom');
      expect(result).toBeDefined();
      expect(result!.providerId).toBe('phantom');
    });

    it('should find MetaMask by RDNS', () => {
      const result = getCorrelationByRdns('io.metamask');
      expect(result).toBeDefined();
      expect(result!.providerId).toBe('metamask');
    });

    it('should return undefined for unknown RDNS', () => {
      const result = getCorrelationByRdns('com.unknown.wallet');
      expect(result).toBeUndefined();
    });
  });

  describe('getCorrelationByName', () => {
    it('should find Phantom by name', () => {
      const result = getCorrelationByName('Phantom');
      expect(result).toBeDefined();
      expect(result!.providerId).toBe('phantom');
    });

    it('should be case-insensitive', () => {
      const result = getCorrelationByName('phantom');
      expect(result).toBeDefined();
      expect(result!.providerId).toBe('phantom');
    });

    it('should return undefined for unknown name', () => {
      const result = getCorrelationByName('Unknown Wallet XYZ');
      expect(result).toBeUndefined();
    });
  });

  describe('getCorrelationByProviderId', () => {
    it('should find by provider ID', () => {
      const result = getCorrelationByProviderId('phantom');
      expect(result).toBeDefined();
      expect(result!.providerId).toBe('phantom');
    });

    it('should return undefined for unknown provider ID', () => {
      const result = getCorrelationByProviderId('unknown' as any);
      expect(result).toBeUndefined();
    });
  });

  describe('CAIP-2 namespace mapping', () => {
    it('should map eip155 to EVM', () => {
      expect(CAIP2_NAMESPACE_TO_CHAIN_FAMILY['eip155']).toBe(ChainFamily.EVM);
    });

    it('should map solana to SOLANA', () => {
      expect(CAIP2_NAMESPACE_TO_CHAIN_FAMILY['solana']).toBe(ChainFamily.SOLANA);
    });

    it('should map bip122 to BITCOIN', () => {
      expect(CAIP2_NAMESPACE_TO_CHAIN_FAMILY['bip122']).toBe(ChainFamily.BITCOIN);
    });

    it('should map cosmos to COSMOS', () => {
      expect(CAIP2_NAMESPACE_TO_CHAIN_FAMILY['cosmos']).toBe(ChainFamily.COSMOS);
    });
  });

  describe('chainFamilyFromCaip2Namespace', () => {
    it('should return ChainFamily for known namespace', () => {
      expect(chainFamilyFromCaip2Namespace('eip155')).toBe(ChainFamily.EVM);
    });

    it('should return undefined for unknown namespace', () => {
      expect(chainFamilyFromCaip2Namespace('unknown')).toBeUndefined();
    });
  });
});
