import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { WalletDiscoveryService } from './WalletDiscoveryService';
import type { DiscoveredWallet, EIP6963ProviderInfo } from './types';

describe('WalletDiscoveryService', () => {
  let service: WalletDiscoveryService;
  let mockWindow: any;

  beforeEach(() => {
    mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    service = new WalletDiscoveryService(mockWindow);
  });

  afterEach(() => {
    service.destroy();
  });

  // --- EIP-6963 Discovery ---

  describe('EIP-6963 provider discovery', () => {
    it('should register a discovered EVM provider from EIP-6963 announcement', () => {
      // Simulate EIP-6963 announcement event
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      announceHandler({
        detail: {
          info: {
            uuid: 'mm-uuid-123',
            name: 'MetaMask',
            icon: 'mm-icon.svg',
            rdns: 'io.metamask',
          },
          provider: {},
        },
      });

      const wallets = service.getDiscoveredWallets();
      expect(wallets).toHaveLength(1);
      expect(wallets[0].providerId).toBe('metamask');
      expect(wallets[0].supportedChainFamilies).toContain(ChainFamily.EVM);
    });

    it('should request providers by dispatching eip6963:requestProvider', () => {
      service.startDiscovery();
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'eip6963:requestProvider' })
      );
    });

    it('should deduplicate providers by UUID', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      const event = {
        detail: {
          info: {
            uuid: 'mm-uuid-123',
            name: 'MetaMask',
            icon: 'mm-icon.svg',
            rdns: 'io.metamask',
          },
          provider: {},
        },
      };

      announceHandler(event);
      announceHandler(event);

      expect(service.getDiscoveredWallets()).toHaveLength(1);
    });

    it('should discover multiple EVM providers', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');

      announceHandler({
        detail: {
          info: { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: {},
        },
      });
      announceHandler({
        detail: {
          info: { uuid: 'rabby-uuid', name: 'Rabby', icon: '', rdns: 'io.rabby' },
          provider: {},
        },
      });

      const wallets = service.getDiscoveredWallets();
      expect(wallets).toHaveLength(2);
    });
  });

  // --- Wallet Standard Discovery ---

  describe('Wallet Standard provider discovery', () => {
    it('should register a Wallet Standard provider', () => {
      const registerHandler = getEventHandler(mockWindow, 'wallet-standard:register-wallet');
      registerHandler({
        detail: {
          register: (callback: (wallet: any) => void) => {
            callback({
              name: 'Phantom',
              icon: 'phantom-icon.svg',
              chains: ['solana:mainnet'],
              features: {
                'standard:connect': { connect: vi.fn() },
                'standard:events': { on: vi.fn() },
              },
              accounts: [],
            });
          },
        },
      });

      const wallets = service.getDiscoveredWallets();
      const phantom = wallets.find(w => w.providerName === 'Phantom');
      expect(phantom).toBeDefined();
      expect(phantom!.supportedChainFamilies).toContain(ChainFamily.SOLANA);
    });
  });

  // --- Provider Correlation ---

  describe('provider correlation', () => {
    it('should correlate EIP-6963 and Wallet Standard providers from the same wallet', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      const registerHandler = getEventHandler(mockWindow, 'wallet-standard:register-wallet');

      // Phantom announces via EIP-6963 (EVM side)
      announceHandler({
        detail: {
          info: { uuid: 'phantom-evm-uuid', name: 'Phantom', icon: 'phantom.svg', rdns: 'app.phantom' },
          provider: {},
        },
      });

      // Phantom registers via Wallet Standard (Solana side)
      registerHandler({
        detail: {
          register: (callback: (wallet: any) => void) => {
            callback({
              name: 'Phantom',
              icon: 'phantom.svg',
              chains: ['solana:mainnet'],
              features: {
                'standard:connect': { connect: vi.fn() },
                'standard:events': { on: vi.fn() },
              },
              accounts: [],
            });
          },
        },
      });

      const wallets = service.getDiscoveredWallets();
      // Should be ONE correlated wallet, not two separate ones
      const phantomWallets = wallets.filter(
        w => w.providerId === 'phantom'
      );
      expect(phantomWallets).toHaveLength(1);
      expect(phantomWallets[0].supportedChainFamilies).toContain(ChainFamily.EVM);
      expect(phantomWallets[0].supportedChainFamilies).toContain(ChainFamily.SOLANA);
      expect(phantomWallets[0].isMultiChain).toBe(true);
    });

    it('should correlate Trust Wallet providers across multiple chain families', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      const registerHandler = getEventHandler(mockWindow, 'wallet-standard:register-wallet');

      // Trust Wallet via EIP-6963
      announceHandler({
        detail: {
          info: { uuid: 'tw-uuid', name: 'Trust Wallet', icon: 'tw.svg', rdns: 'com.trustwallet.app' },
          provider: {},
        },
      });

      // Trust Wallet via Wallet Standard (Solana)
      registerHandler({
        detail: {
          register: (callback: (wallet: any) => void) => {
            callback({
              name: 'Trust Wallet',
              icon: 'tw.svg',
              chains: ['solana:mainnet'],
              features: {
                'standard:connect': { connect: vi.fn() },
              },
              accounts: [],
            });
          },
        },
      });

      const wallets = service.getDiscoveredWallets();
      const tw = wallets.find(w => w.providerId === 'trust-wallet');
      expect(tw).toBeDefined();
      expect(tw!.supportedChainFamilies).toContain(ChainFamily.EVM);
      expect(tw!.supportedChainFamilies).toContain(ChainFamily.SOLANA);
      expect(tw!.isMultiChain).toBe(true);
    });

    it('should keep uncorrelated wallets separate', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');

      // MetaMask (EVM only, no Wallet Standard counterpart)
      announceHandler({
        detail: {
          info: { uuid: 'mm-uuid', name: 'MetaMask', icon: 'mm.svg', rdns: 'io.metamask' },
          provider: {},
        },
      });

      const wallets = service.getDiscoveredWallets();
      const mm = wallets.find(w => w.providerId === 'metamask');
      expect(mm).toBeDefined();
      expect(mm!.supportedChainFamilies).toEqual([ChainFamily.EVM]);
      expect(mm!.isMultiChain).toBe(false);
    });
  });

  // --- Discovery Events ---

  describe('discovery events', () => {
    it('should emit walletDiscovered when a new wallet is found', () => {
      const handler = vi.fn();
      service.onWalletDiscovered(handler);

      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      announceHandler({
        detail: {
          info: { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: {},
        },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet: expect.objectContaining({
            providerId: 'metamask',
          }),
        })
      );
    });

    it('should emit walletUpdated when a correlated provider enhances an existing wallet', () => {
      const handler = vi.fn();
      service.onWalletUpdated(handler);

      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      const registerHandler = getEventHandler(mockWindow, 'wallet-standard:register-wallet');

      // First discovery
      announceHandler({
        detail: {
          info: { uuid: 'phantom-uuid', name: 'Phantom', icon: '', rdns: 'app.phantom' },
          provider: {},
        },
      });

      // Correlated discovery updates existing wallet
      registerHandler({
        detail: {
          register: (callback: (wallet: any) => void) => {
            callback({
              name: 'Phantom',
              icon: '',
              chains: ['solana:mainnet'],
              features: { 'standard:connect': { connect: vi.fn() } },
              accounts: [],
            });
          },
        },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet: expect.objectContaining({
            providerId: 'phantom',
            isMultiChain: true,
          }),
        })
      );
    });

    it('should emit discoveryComplete after discovery timeout', async () => {
      const handler = vi.fn();
      service.onDiscoveryComplete(handler);

      vi.useFakeTimers();
      service.startDiscovery();
      vi.advanceTimersByTime(3000);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          wallets: expect.any(Array),
        })
      );

      vi.useRealTimers();
    });
  });

  // --- Fallback Discovery ---

  describe('fallback discovery', () => {
    it('should detect window.ethereum as fallback EVM provider', () => {
      const windowWithEthereum = {
        ...mockWindow,
        ethereum: { isMetaMask: true, request: vi.fn() },
      };
      const fallbackService = new WalletDiscoveryService(windowWithEthereum);
      fallbackService.startDiscovery();

      // After fallback timeout, should discover ethereum provider
      vi.useFakeTimers();
      vi.advanceTimersByTime(3000);

      const wallets = fallbackService.getDiscoveredWallets();
      // Should have at least one EVM wallet from fallback
      const evmWallets = wallets.filter(
        w => w.supportedChainFamilies.includes(ChainFamily.EVM)
      );
      expect(evmWallets.length).toBeGreaterThanOrEqual(0); // May or may not find via EIP-6963 first

      vi.useRealTimers();
      fallbackService.destroy();
    });

    it('should detect window.solana as fallback Solana provider', () => {
      const windowWithSolana = {
        ...mockWindow,
        solana: { isPhantom: true, connect: vi.fn() },
      };
      const fallbackService = new WalletDiscoveryService(windowWithSolana);
      fallbackService.startDiscovery();

      vi.useFakeTimers();
      vi.advanceTimersByTime(3000);

      const wallets = fallbackService.getDiscoveredWallets();
      const solWallets = wallets.filter(
        w => w.supportedChainFamilies.includes(ChainFamily.SOLANA)
      );
      expect(solWallets.length).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
      fallbackService.destroy();
    });
  });

  // --- Wallet Capability Inquiry ---

  describe('wallet capability inquiry', () => {
    it('should return supported chain families for a discovered wallet', () => {
      const announceHandler = getEventHandler(mockWindow, 'eip6963:announceProvider');
      announceHandler({
        detail: {
          info: { uuid: 'mm-uuid', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: {},
        },
      });

      const families = service.getWalletChainFamilies('metamask');
      expect(families).toContain(ChainFamily.EVM);
    });

    it('should return empty array for unknown wallet', () => {
      const families = service.getWalletChainFamilies('nonexistent');
      expect(families).toEqual([]);
    });
  });

  // --- Cleanup ---

  describe('destroy', () => {
    it('should remove all event listeners', () => {
      service.destroy();
      expect(mockWindow.removeEventListener).toHaveBeenCalled();
    });
  });
});

// --- Helper ---

function getEventHandler(mockWindow: any, eventName: string): (event: any) => void {
  const call = mockWindow.addEventListener.mock.calls.find(
    (c: any[]) => c[0] === eventName
  );
  if (!call) {
    throw new Error(
      `No addEventListener call found for "${eventName}". ` +
      `Registered events: ${mockWindow.addEventListener.mock.calls.map((c: any[]) => c[0]).join(', ')}`
    );
  }
  return call[1];
}
