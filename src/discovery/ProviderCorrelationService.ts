import { ChainFamily } from '@cygnus-wealth/data-models';
import type { WalletProviderId } from '@cygnus-wealth/data-models';
import type { DiscoveredProvider, DiscoveredWallet } from './types';
import { getCorrelationByRdns, getCorrelationByName } from './correlation-registry';

export class ProviderCorrelationService {
  correlate(providers: DiscoveredProvider[]): DiscoveredWallet[] {
    if (providers.length === 0) return [];

    const walletMap = new Map<string, {
      providerId: WalletProviderId | string;
      name: string;
      icon: string;
      chainFamilies: Set<ChainFamily>;
      providers: Map<ChainFamily, DiscoveredProvider>;
    }>();

    for (const provider of providers) {
      const correlation = provider.rdns
        ? getCorrelationByRdns(provider.rdns)
        : getCorrelationByName(provider.name);

      const key = correlation?.providerId ?? this.generateUnknownKey(provider);
      const name = correlation?.name ?? provider.name;
      const providerId = correlation?.providerId ?? key;

      let entry = walletMap.get(key);
      if (!entry) {
        entry = {
          providerId,
          name,
          icon: provider.icon,
          chainFamilies: new Set<ChainFamily>(),
          providers: new Map(),
        };
        walletMap.set(key, entry);
      }

      entry.chainFamilies.add(provider.chainFamily);
      if (!entry.providers.has(provider.chainFamily)) {
        entry.providers.set(provider.chainFamily, provider);
      }
      if (!entry.icon && provider.icon) {
        entry.icon = provider.icon;
      }
    }

    return Array.from(walletMap.values()).map(entry => ({
      providerId: entry.providerId,
      name: entry.name,
      icon: entry.icon,
      supportedChainFamilies: Array.from(entry.chainFamilies),
      isMultiChain: entry.chainFamilies.size > 1,
      providers: entry.providers,
    }));
  }

  private generateUnknownKey(provider: DiscoveredProvider): string {
    return provider.rdns ?? `unknown:${provider.name.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
