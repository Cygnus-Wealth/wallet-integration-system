import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { WalletStandardDiscovery } from './WalletStandardDiscovery';
import type { DiscoveredProvider } from './types';

describe('WalletStandardDiscovery', () => {
  let discovery: WalletStandardDiscovery;
  let eventListeners: Map<string, Function[]>;
  let registeredWallets: any[];

  beforeEach(() => {
    eventListeners = new Map();
    registeredWallets = [];

    vi.stubGlobal('window', {
      addEventListener: vi.fn((type: string, listener: Function) => {
        const listeners = eventListeners.get(type) || [];
        listeners.push(listener);
        eventListeners.set(type, listeners);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: Event) => {
        if (event.type === 'wallet-standard:app-ready') {
          // The register callback was passed via the event detail
          const detail = (event as CustomEvent).detail;
          if (detail && detail.register) {
            // Simulate wallets registering themselves
            for (const wallet of registeredWallets) {
              detail.register(wallet);
            }
          }
        }
        return true;
      }),
    });

    discovery = new WalletStandardDiscovery();
  });

  afterEach(() => {
    discovery.destroy();
    vi.unstubAllGlobals();
  });

  describe('startDiscovery', () => {
    it('should dispatch wallet-standard:app-ready event', () => {
      discovery.startDiscovery();
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wallet-standard:app-ready' })
      );
    });
  });

  describe('wallet registration handling', () => {
    it('should collect wallets registered via Wallet Standard', () => {
      registeredWallets = [
        {
          name: 'Phantom',
          icon: 'https://phantom.app/icon.svg',
          chains: ['solana:mainnet'],
          features: {
            'standard:connect': { connect: vi.fn() },
          },
          accounts: [],
        },
      ];

      discovery.startDiscovery();

      const providers = discovery.getDiscoveredProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].chainFamily).toBe(ChainFamily.SOLANA);
      expect(providers[0].name).toBe('Phantom');
    });

    it('should detect chain family from wallet chains property', () => {
      registeredWallets = [
        {
          name: 'Suiet',
          icon: '',
          chains: ['sui:mainnet'],
          features: { 'standard:connect': { connect: vi.fn() } },
          accounts: [],
        },
      ];

      discovery.startDiscovery();

      const providers = discovery.getDiscoveredProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].chainFamily).toBe(ChainFamily.SUI);
    });

    it('should create multiple providers for multi-chain wallets', () => {
      registeredWallets = [
        {
          name: 'Phantom',
          icon: '',
          chains: ['solana:mainnet', 'sui:mainnet'],
          features: { 'standard:connect': { connect: vi.fn() } },
          accounts: [],
        },
      ];

      discovery.startDiscovery();

      const providers = discovery.getDiscoveredProviders();
      // One provider per chain family
      expect(providers.length).toBe(2);
      const families = providers.map(p => p.chainFamily).sort();
      expect(families).toEqual([ChainFamily.SOLANA, ChainFamily.SUI]);
    });

    it('should skip EVM chains from Wallet Standard (handled by EIP-6963)', () => {
      registeredWallets = [
        {
          name: 'Phantom',
          icon: '',
          chains: ['eip155:1', 'solana:mainnet'],
          features: { 'standard:connect': { connect: vi.fn() } },
          accounts: [],
        },
      ];

      discovery.startDiscovery();

      const providers = discovery.getDiscoveredProviders();
      // Only Solana, not EVM (EVM is handled by EIP-6963)
      expect(providers.length).toBe(1);
      expect(providers[0].chainFamily).toBe(ChainFamily.SOLANA);
    });

    it('should emit onProviderDiscovered callback', () => {
      const callback = vi.fn();
      discovery.onProviderDiscovered(callback);

      registeredWallets = [
        {
          name: 'Phantom',
          icon: '',
          chains: ['solana:mainnet'],
          features: { 'standard:connect': { connect: vi.fn() } },
          accounts: [],
        },
      ];

      discovery.startDiscovery();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          chainFamily: ChainFamily.SOLANA,
          name: 'Phantom',
        })
      );
    });
  });

  describe('destroy', () => {
    it('should clean up on destroy', () => {
      discovery.startDiscovery();
      discovery.destroy();
      expect(discovery.getDiscoveredProviders()).toEqual([]);
    });
  });
});
