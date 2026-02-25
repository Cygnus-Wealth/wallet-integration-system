import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainFamily } from '@cygnus-wealth/data-models';
import { GlobalInjectionDiscovery } from './GlobalInjectionDiscovery';

describe('GlobalInjectionDiscovery', () => {
  let discovery: GlobalInjectionDiscovery;

  beforeEach(() => {
    vi.stubGlobal('window', {});
    discovery = new GlobalInjectionDiscovery();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('detect', () => {
    it('should detect window.ethereum as EVM fallback', () => {
      (window as any).ethereum = { request: vi.fn(), isMetaMask: true };

      const providers = discovery.detect();

      expect(providers.length).toBeGreaterThanOrEqual(1);
      const evm = providers.find(p => p.chainFamily === ChainFamily.EVM);
      expect(evm).toBeDefined();
      expect(evm!.isFallback).toBe(true);
    });

    it('should detect window.solana as Solana fallback', () => {
      (window as any).solana = { isPhantom: true, connect: vi.fn() };

      const providers = discovery.detect();

      const solana = providers.find(p => p.chainFamily === ChainFamily.SOLANA);
      expect(solana).toBeDefined();
      expect(solana!.isFallback).toBe(true);
    });

    it('should detect window.suiWallet as SUI fallback', () => {
      (window as any).suiWallet = { getAccounts: vi.fn() };

      const providers = discovery.detect();

      const sui = providers.find(p => p.chainFamily === ChainFamily.SUI);
      expect(sui).toBeDefined();
      expect(sui!.isFallback).toBe(true);
    });

    it('should return empty array when no globals present', () => {
      const providers = discovery.detect();
      expect(providers).toEqual([]);
    });

    it('should detect multiple globals simultaneously', () => {
      (window as any).ethereum = { request: vi.fn() };
      (window as any).solana = { connect: vi.fn() };

      const providers = discovery.detect();

      expect(providers.length).toBe(2);
      const families = providers.map(p => p.chainFamily).sort();
      expect(families).toEqual([ChainFamily.EVM, ChainFamily.SOLANA]);
    });

    it('should try to identify provider name from window.ethereum flags', () => {
      (window as any).ethereum = { request: vi.fn(), isMetaMask: true };

      const providers = discovery.detect();

      const evm = providers.find(p => p.chainFamily === ChainFamily.EVM);
      expect(evm!.name).toContain('MetaMask');
    });

    it('should try to identify Phantom from window.solana', () => {
      (window as any).solana = { connect: vi.fn(), isPhantom: true };

      const providers = discovery.detect();

      const solana = providers.find(p => p.chainFamily === ChainFamily.SOLANA);
      expect(solana!.name).toContain('Phantom');
    });
  });
});
