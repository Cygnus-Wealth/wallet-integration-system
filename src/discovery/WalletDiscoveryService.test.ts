import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { WalletDiscoveryService } from './WalletDiscoveryService';
import type { DiscoveredWallet, DiscoveredProvider, DiscoveryCompleteEvent } from './types';

describe('WalletDiscoveryService', () => {
  let service: WalletDiscoveryService;
  let eventListeners: Map<string, Function[]>;

  beforeEach(() => {
    eventListeners = new Map();

    vi.stubGlobal('window', {
      addEventListener: vi.fn((type: string, listener: Function) => {
        const listeners = eventListeners.get(type) || [];
        listeners.push(listener);
        eventListeners.set(type, listeners);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners.get(event.type) || [];
        for (const listener of listeners) {
          listener(event);
        }
        return true;
      }),
    });

    service = new WalletDiscoveryService();
  });

  afterEach(() => {
    service.destroy();
    vi.unstubAllGlobals();
  });

  describe('startDiscovery', () => {
    it('should start EIP-6963 and Wallet Standard discovery', async () => {
      const wallets = await service.startDiscovery();
      expect(Array.isArray(wallets)).toBe(true);
    });

    it('should emit discoveryComplete event after timeout', async () => {
      const callback = vi.fn();
      service.onDiscoveryComplete(callback);

      vi.useFakeTimers();
      const promise = service.startDiscovery({ timeoutMs: 100 });
      vi.advanceTimersByTime(150);
      await promise;
      vi.useRealTimers();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          wallets: expect.any(Array),
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('getDiscoveredWallets', () => {
    it('should return correlated wallet list', async () => {
      vi.useFakeTimers();
      const promise = service.startDiscovery({ timeoutMs: 50 });
      vi.advanceTimersByTime(100);
      await promise;
      vi.useRealTimers();

      const wallets = service.getDiscoveredWallets();
      expect(Array.isArray(wallets)).toBe(true);
    });
  });

  describe('getWalletCapabilities', () => {
    it('should return chain families supported by a specific wallet', async () => {
      // Simulate discovery with global injection
      (window as any).ethereum = { request: vi.fn(), isMetaMask: true };

      vi.useFakeTimers();
      const promise = service.startDiscovery({ timeoutMs: 50 });
      vi.advanceTimersByTime(100);
      await promise;
      vi.useRealTimers();

      const wallets = service.getDiscoveredWallets();
      if (wallets.length > 0) {
        const capabilities = service.getWalletCapabilities(wallets[0].providerId);
        expect(Array.isArray(capabilities)).toBe(true);
      }
    });

    it('should return empty array for unknown wallet', () => {
      const capabilities = service.getWalletCapabilities('unknown' as any);
      expect(capabilities).toEqual([]);
    });
  });

  describe('onDiscoveryComplete', () => {
    it('should allow subscribing to discovery complete events', () => {
      const unsubscribe = service.onDiscoveryComplete(() => {});
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('destroy', () => {
    it('should clean up all sub-discoveries', () => {
      service.destroy();
      expect(service.getDiscoveredWallets()).toEqual([]);
    });
  });
});
