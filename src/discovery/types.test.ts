import { describe, it, expect } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId } from '@cygnus-wealth/data-models';

// These types are the new discovery-layer types required by en-o8w
import type {
  DiscoveredProvider,
  DiscoveredWallet,
  DiscoveryEvent,
  DiscoveryCompleteEvent,
  ChainFamilyConnectionChangedEvent,
} from './types';

describe('Discovery Types', () => {
  describe('DiscoveredProvider', () => {
    it('should represent an EIP-6963 EVM provider', () => {
      const provider: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: 'io.metamask',
        name: 'MetaMask',
        icon: 'https://metamask.io/icon.svg',
        uuid: 'abc-123',
        provider: {} as any,
      };
      expect(provider.chainFamily).toBe(ChainFamily.EVM);
      expect(provider.rdns).toBe('io.metamask');
      expect(provider.uuid).toBe('abc-123');
    });

    it('should represent a Wallet Standard Solana provider', () => {
      const provider: DiscoveredProvider = {
        chainFamily: ChainFamily.SOLANA,
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        provider: {} as any,
      };
      expect(provider.chainFamily).toBe(ChainFamily.SOLANA);
      expect(provider.rdns).toBeUndefined();
      expect(provider.uuid).toBeUndefined();
    });

    it('should represent a global injection fallback provider', () => {
      const provider: DiscoveredProvider = {
        chainFamily: ChainFamily.SOLANA,
        name: 'Phantom (fallback)',
        icon: '',
        provider: {} as any,
        isFallback: true,
      };
      expect(provider.isFallback).toBe(true);
    });
  });

  describe('DiscoveredWallet', () => {
    it('should represent a single-chain wallet', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'metamask',
        name: 'MetaMask',
        icon: 'https://metamask.io/icon.svg',
        supportedChainFamilies: [ChainFamily.EVM],
        isMultiChain: false,
        providers: new Map(),
      };
      expect(wallet.isMultiChain).toBe(false);
      expect(wallet.supportedChainFamilies).toEqual([ChainFamily.EVM]);
    });

    it('should represent a multi-chain wallet like Phantom', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'phantom',
        name: 'Phantom',
        icon: 'https://phantom.app/icon.svg',
        supportedChainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
        isMultiChain: true,
        providers: new Map([
          [ChainFamily.EVM, {} as DiscoveredProvider],
          [ChainFamily.SOLANA, {} as DiscoveredProvider],
        ]),
      };
      expect(wallet.isMultiChain).toBe(true);
      expect(wallet.supportedChainFamilies).toContain(ChainFamily.EVM);
      expect(wallet.supportedChainFamilies).toContain(ChainFamily.SOLANA);
      expect(wallet.providers.size).toBe(2);
    });

    it('should represent Trust Wallet with many chain families', () => {
      const wallet: DiscoveredWallet = {
        providerId: 'trust-wallet',
        name: 'Trust Wallet',
        icon: '',
        supportedChainFamilies: [
          ChainFamily.EVM,
          ChainFamily.SOLANA,
          ChainFamily.COSMOS,
          ChainFamily.APTOS,
        ],
        isMultiChain: true,
        providers: new Map(),
      };
      expect(wallet.supportedChainFamilies.length).toBe(4);
    });
  });

  describe('DiscoveryEvent types', () => {
    it('should represent a discovery complete event', () => {
      const event: DiscoveryCompleteEvent = {
        wallets: [],
        timestamp: new Date().toISOString(),
      };
      expect(event.wallets).toEqual([]);
      expect(event.timestamp).toBeDefined();
    });

    it('should represent a chain family connection changed event', () => {
      const event: ChainFamilyConnectionChangedEvent = {
        connectionId: 'phantom:abc123' as any,
        chainFamily: ChainFamily.SOLANA,
        action: 'added',
      };
      expect(event.action).toBe('added');
      expect(event.chainFamily).toBe(ChainFamily.SOLANA);
    });

    it('should represent chain family removal', () => {
      const event: ChainFamilyConnectionChangedEvent = {
        connectionId: 'phantom:abc123' as any,
        chainFamily: ChainFamily.EVM,
        action: 'removed',
      };
      expect(event.action).toBe('removed');
    });
  });
});
