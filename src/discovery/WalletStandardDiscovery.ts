import { ChainFamily } from '@cygnus-wealth/data-models';
import type { DiscoveredProvider } from './types';

interface WalletStandardWallet {
  name: string;
  icon: string;
  chains: string[];
  features: Record<string, unknown>;
  accounts: unknown[];
}

const CHAIN_PREFIX_TO_FAMILY: Record<string, ChainFamily> = {
  'solana': ChainFamily.SOLANA,
  'sui': ChainFamily.SUI,
  'aptos': ChainFamily.APTOS,
  'cosmos': ChainFamily.COSMOS,
  'bip122': ChainFamily.BITCOIN,
};

function chainFamilyFromWalletStandardChain(chain: string): ChainFamily | null {
  const prefix = chain.split(':')[0];
  // Skip EVM chains — those are handled by EIP-6963
  if (prefix === 'eip155') return null;
  return CHAIN_PREFIX_TO_FAMILY[prefix] ?? null;
}

export class WalletStandardDiscovery {
  private providers: DiscoveredProvider[] = [];
  private callbacks: ((provider: DiscoveredProvider) => void)[] = [];

  startDiscovery(): void {
    const register = (wallet: WalletStandardWallet) => {
      const familiesFromChains = new Set<ChainFamily>();
      for (const chain of wallet.chains) {
        const family = chainFamilyFromWalletStandardChain(chain);
        if (family) familiesFromChains.add(family);
      }

      for (const family of familiesFromChains) {
        const discovered: DiscoveredProvider = {
          chainFamily: family,
          name: wallet.name,
          icon: wallet.icon,
          provider: wallet,
        };
        this.providers.push(discovered);
        for (const cb of this.callbacks) {
          cb(discovered);
        }
      }
    };

    const event = new CustomEvent('wallet-standard:app-ready', {
      detail: { register },
    });
    window.dispatchEvent(event);
  }

  getDiscoveredProviders(): DiscoveredProvider[] {
    return [...this.providers];
  }

  onProviderDiscovered(callback: (provider: DiscoveredProvider) => void): void {
    this.callbacks.push(callback);
  }

  destroy(): void {
    this.providers = [];
    this.callbacks = [];
  }
}
