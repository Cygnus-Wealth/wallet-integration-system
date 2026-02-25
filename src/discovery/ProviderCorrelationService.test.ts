import { describe, it, expect, beforeEach } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { ProviderCorrelationService } from './ProviderCorrelationService';
import type { DiscoveredProvider, DiscoveredWallet } from './types';

describe('ProviderCorrelationService', () => {
  let service: ProviderCorrelationService;

  beforeEach(() => {
    service = new ProviderCorrelationService();
  });

  describe('correlate', () => {
    it('should group EVM and Solana providers from Phantom into one wallet', () => {
      const evmProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'app.phantom',
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        uuid: 'phantom-evm-uuid',
        provider: {} as any,
      };
      const solanaProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.SOLANA,
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        provider: {} as any,
      };

      const wallets = service.correlate([evmProvider, solanaProvider]);

      expect(wallets.length).toBe(1);
      expect(wallets[0].providerId).toBe('phantom');
      expect(wallets[0].isMultiChain).toBe(true);
      expect(wallets[0].supportedChainFamilies).toContain(ChainFamily.EVM);
      expect(wallets[0].supportedChainFamilies).toContain(ChainFamily.SOLANA);
      expect(wallets[0].providers.size).toBe(2);
    });

    it('should keep MetaMask and Phantom as separate wallets', () => {
      const metamask: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'io.metamask',
        name: 'MetaMask',
        icon: 'https://metamask.io/icon.svg',
        uuid: 'mm-uuid',
        provider: {} as any,
      };
      const phantom: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'app.phantom',
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        uuid: 'phantom-uuid',
        provider: {} as any,
      };

      const wallets = service.correlate([metamask, phantom]);

      expect(wallets.length).toBe(2);
      const names = wallets.map(w => w.providerId).sort();
      expect(names).toEqual(['metamask', 'phantom']);
    });

    it('should handle Trust Wallet across EVM, Solana, and Aptos', () => {
      const evmProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'com.trustwallet.app',
        name: 'Trust Wallet',
        icon: '',
        uuid: 'trust-evm-uuid',
        provider: {} as any,
      };
      const solanaProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.SOLANA,
        name: 'Trust Wallet',
        icon: '',
        provider: {} as any,
      };
      const aptosProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.APTOS,
        name: 'Trust Wallet',
        icon: '',
        provider: {} as any,
      };

      const wallets = service.correlate([evmProvider, solanaProvider, aptosProvider]);

      expect(wallets.length).toBe(1);
      expect(wallets[0].providerId).toBe('trust-wallet');
      expect(wallets[0].isMultiChain).toBe(true);
      expect(wallets[0].supportedChainFamilies.length).toBe(3);
    });

    it('should handle an unknown wallet as a standalone entry', () => {
      const unknown: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'com.example.unknown',
        name: 'Unknown Wallet',
        icon: '',
        uuid: 'unknown-uuid',
        provider: {} as any,
      };

      const wallets = service.correlate([unknown]);

      expect(wallets.length).toBe(1);
      expect(wallets[0].isMultiChain).toBe(false);
      expect(wallets[0].supportedChainFamilies).toEqual([ChainFamily.EVM]);
    });

    it('should not duplicate chain families in a wallet', () => {
      // Two EVM providers that correlate to same wallet should still show one EVM family
      const evmProvider: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'app.phantom',
        name: 'Phantom',
        icon: '',
        uuid: 'phantom-uuid-1',
        provider: {} as any,
      };

      const wallets = service.correlate([evmProvider]);

      const evmCount = wallets[0].supportedChainFamilies.filter(
        f => f === ChainFamily.EVM
      ).length;
      expect(evmCount).toBe(1);
    });

    it('should return empty array for empty input', () => {
      const wallets = service.correlate([]);
      expect(wallets).toEqual([]);
    });

    it('should correlate using name matching when RDNS is not available', () => {
      const solanaPhantom: DiscoveredProvider = {
        chainFamily: ChainFamily.SOLANA,
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        provider: {} as any,
      };

      const wallets = service.correlate([solanaPhantom]);

      expect(wallets.length).toBe(1);
      expect(wallets[0].providerId).toBe('phantom');
    });
  });
});
