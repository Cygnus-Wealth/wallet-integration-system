import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { Eip6963Discovery } from './Eip6963Discovery';
import type { DiscoveredProvider } from './types';

describe('Eip6963Discovery', () => {
  let discovery: Eip6963Discovery;
  let eventListeners: Map<string, EventListener[]>;

  beforeEach(() => {
    eventListeners = new Map();

    // Mock window with addEventListener and dispatchEvent
    vi.stubGlobal('window', {
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        const listeners = eventListeners.get(type) || [];
        listeners.push(listener);
        eventListeners.set(type, listeners);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        const listeners = eventListeners.get(type) || [];
        eventListeners.set(type, listeners.filter(l => l !== listener));
      }),
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners.get(event.type) || [];
        for (const listener of listeners) {
          listener(event);
        }
        return true;
      }),
    });

    discovery = new Eip6963Discovery();
  });

  afterEach(() => {
    discovery.destroy();
    vi.unstubAllGlobals();
  });

  describe('startDiscovery', () => {
    it('should dispatch eip6963:requestProvider event', () => {
      discovery.startDiscovery();
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'eip6963:requestProvider' })
      );
    });

    it('should listen for eip6963:announceProvider events', () => {
      discovery.startDiscovery();
      expect(window.addEventListener).toHaveBeenCalledWith(
        'eip6963:announceProvider',
        expect.any(Function)
      );
    });
  });

  describe('provider announcement handling', () => {
    it('should collect providers announced via EIP-6963', () => {
      discovery.startDiscovery();

      // Simulate an EIP-6963 announce event
      const announceEvent = new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            uuid: 'mm-uuid',
            name: 'MetaMask',
            icon: 'https://metamask.io/icon.svg',
            rdns: 'io.metamask',
          },
          provider: { request: vi.fn() },
        },
      });

      // Dispatch to registered listeners
      const listeners = eventListeners.get('eip6963:announceProvider') || [];
      for (const listener of listeners) {
        listener(announceEvent);
      }

      const providers = discovery.getDiscoveredProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].chainFamily).toBe(ChainFamily.EVM);
      expect(providers[0].rdns).toBe('io.metamask');
      expect(providers[0].name).toBe('MetaMask');
      expect(providers[0].uuid).toBe('mm-uuid');
    });

    it('should handle multiple provider announcements', () => {
      discovery.startDiscovery();

      const providers = [
        { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
        { uuid: 'phantom-uuid', name: 'Phantom', icon: '', rdns: 'app.phantom' },
      ];

      for (const info of providers) {
        const event = new CustomEvent('eip6963:announceProvider', {
          detail: { info, provider: { request: vi.fn() } },
        });
        const listeners = eventListeners.get('eip6963:announceProvider') || [];
        for (const listener of listeners) {
          listener(event);
        }
      }

      expect(discovery.getDiscoveredProviders().length).toBe(2);
    });

    it('should deduplicate providers by uuid', () => {
      discovery.startDiscovery();

      const info = { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' };
      const event1 = new CustomEvent('eip6963:announceProvider', {
        detail: { info, provider: { request: vi.fn() } },
      });
      const event2 = new CustomEvent('eip6963:announceProvider', {
        detail: { info, provider: { request: vi.fn() } },
      });

      const listeners = eventListeners.get('eip6963:announceProvider') || [];
      for (const listener of listeners) {
        listener(event1);
        listener(event2);
      }

      expect(discovery.getDiscoveredProviders().length).toBe(1);
    });

    it('should emit onProviderDiscovered callback', () => {
      const callback = vi.fn();
      discovery.onProviderDiscovered(callback);
      discovery.startDiscovery();

      const event = new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: { request: vi.fn() },
        },
      });

      const listeners = eventListeners.get('eip6963:announceProvider') || [];
      for (const listener of listeners) {
        listener(event);
      }

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          chainFamily: ChainFamily.EVM,
          rdns: 'io.metamask',
        })
      );
    });
  });

  describe('destroy', () => {
    it('should remove event listeners on destroy', () => {
      discovery.startDiscovery();
      discovery.destroy();
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'eip6963:announceProvider',
        expect.any(Function)
      );
    });
  });
});
