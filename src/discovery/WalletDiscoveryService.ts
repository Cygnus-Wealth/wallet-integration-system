import { ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId } from '@cygnus-wealth/data-models';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import { Eip6963Discovery } from './Eip6963Discovery';
import { WalletStandardDiscovery } from './WalletStandardDiscovery';
import { GlobalInjectionDiscovery } from './GlobalInjectionDiscovery';
import { ProviderCorrelationService } from './ProviderCorrelationService';
import type { DiscoveredWallet, DiscoveredProvider, DiscoveryCompleteEvent } from './types';

interface DiscoveryEvents {
  discoveryComplete: DiscoveryCompleteEvent;
}

interface DiscoveryOptions {
  timeoutMs?: number;
}

export class WalletDiscoveryService {
  private eip6963 = new Eip6963Discovery();
  private walletStandard = new WalletStandardDiscovery();
  private globalInjection = new GlobalInjectionDiscovery();
  private correlation = new ProviderCorrelationService();
  private events = new TypedEventEmitter<DiscoveryEvents>();
  private wallets: DiscoveredWallet[] = [];

  async startDiscovery(options: DiscoveryOptions = {}): Promise<DiscoveredWallet[]> {
    const timeoutMs = options.timeoutMs ?? 500;

    // Start event-based discoveries
    this.eip6963.startDiscovery();
    this.walletStandard.startDiscovery();

    // Wait for providers to announce
    await new Promise<void>(resolve => setTimeout(resolve, timeoutMs));

    // Collect all providers
    const allProviders: DiscoveredProvider[] = [
      ...this.eip6963.getDiscoveredProviders(),
      ...this.walletStandard.getDiscoveredProviders(),
    ];

    // Add global injection fallbacks only for chain families not yet covered
    const coveredFamilies = new Set(allProviders.map(p => p.chainFamily));
    const fallbacks = this.globalInjection.detect();
    for (const fallback of fallbacks) {
      if (!coveredFamilies.has(fallback.chainFamily)) {
        allProviders.push(fallback);
      }
    }

    // Correlate providers into wallets
    this.wallets = this.correlation.correlate(allProviders);

    // Emit discovery complete
    const event: DiscoveryCompleteEvent = {
      wallets: this.wallets,
      timestamp: new Date().toISOString(),
    };
    this.events.emit('discoveryComplete', event);

    return this.wallets;
  }

  getDiscoveredWallets(): DiscoveredWallet[] {
    return [...this.wallets];
  }

  getWalletCapabilities(providerId: WalletProviderId | string): ChainFamily[] {
    const wallet = this.wallets.find(w => w.providerId === providerId);
    return wallet ? [...wallet.supportedChainFamilies] : [];
  }

  onDiscoveryComplete(handler: (event: DiscoveryCompleteEvent) => void): () => void {
    return this.events.on('discoveryComplete', handler);
  }

  destroy(): void {
    this.eip6963.destroy();
    this.walletStandard.destroy();
    this.wallets = [];
    this.events.removeAllListeners();
  }
}
