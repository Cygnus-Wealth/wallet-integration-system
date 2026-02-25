import { ChainFamily } from '@cygnus-wealth/data-models';
import type { DiscoveredProvider } from './types';

export class GlobalInjectionDiscovery {
  detect(): DiscoveredProvider[] {
    const providers: DiscoveredProvider[] = [];

    if (typeof window === 'undefined') return providers;

    // EVM fallback: window.ethereum
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      let name = 'Unknown EVM Wallet';
      if (ethereum.isMetaMask) name = 'MetaMask (fallback)';
      else if (ethereum.isRabby) name = 'Rabby (fallback)';
      else if (ethereum.isCoinbaseWallet) name = 'Coinbase Wallet (fallback)';

      providers.push({
        chainFamily: ChainFamily.EVM,
        name,
        icon: '',
        provider: ethereum,
        isFallback: true,
      });
    }

    // Solana fallback: window.solana
    const solana = (window as any).solana;
    if (solana) {
      let name = 'Unknown Solana Wallet';
      if (solana.isPhantom) name = 'Phantom (fallback)';
      else if (solana.isSolflare) name = 'Solflare (fallback)';
      else if (solana.isBackpack) name = 'Backpack (fallback)';

      providers.push({
        chainFamily: ChainFamily.SOLANA,
        name,
        icon: '',
        provider: solana,
        isFallback: true,
      });
    }

    // SUI fallback: window.suiWallet
    const suiWallet = (window as any).suiWallet;
    if (suiWallet) {
      providers.push({
        chainFamily: ChainFamily.SUI,
        name: 'SUI Wallet (fallback)',
        icon: '',
        provider: suiWallet,
        isFallback: true,
      });
    }

    return providers;
  }
}
