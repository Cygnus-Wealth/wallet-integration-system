import { ChainFamily } from '@cygnus-wealth/data-models';
import type { DiscoveredProvider } from './types';

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963AnnounceEvent extends Event {
  detail: {
    info: Eip6963ProviderInfo;
    provider: unknown;
  };
}

export class Eip6963Discovery {
  private providers: DiscoveredProvider[] = [];
  private seenUuids = new Set<string>();
  private announceHandler: ((event: Event) => void) | null = null;
  private callbacks: ((provider: DiscoveredProvider) => void)[] = [];

  startDiscovery(): void {
    this.announceHandler = (event: Event) => {
      const announceEvent = event as Eip6963AnnounceEvent;
      const { info, provider } = announceEvent.detail;

      if (this.seenUuids.has(info.uuid)) return;
      this.seenUuids.add(info.uuid);

      const discovered: DiscoveredProvider = {
        chainFamily: ChainFamily.EVM,
        rdns: info.rdns,
        name: info.name,
        icon: info.icon,
        uuid: info.uuid,
        provider,
      };

      this.providers.push(discovered);
      for (const cb of this.callbacks) {
        cb(discovered);
      }
    };

    window.addEventListener('eip6963:announceProvider', this.announceHandler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  getDiscoveredProviders(): DiscoveredProvider[] {
    return [...this.providers];
  }

  onProviderDiscovered(callback: (provider: DiscoveredProvider) => void): void {
    this.callbacks.push(callback);
  }

  destroy(): void {
    if (this.announceHandler) {
      window.removeEventListener('eip6963:announceProvider', this.announceHandler);
      this.announceHandler = null;
    }
    this.providers = [];
    this.seenUuids.clear();
    this.callbacks = [];
  }
}
