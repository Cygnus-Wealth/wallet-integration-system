import { ChainFamily } from '@cygnus-wealth/data-models';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import type { WalletProviderId } from '../types/multi-wallet';
import type {
  DiscoveredWallet,
  EIP6963ProviderInfo,
  WalletStandardWallet,
  CorrelationEntry,
  WalletDiscoveredEvent,
  WalletUpdatedEvent,
  DiscoveryCompletedEvent,
  DiscoverySource,
} from './types';

// --- Correlation Registry ---

const CORRELATION_REGISTRY: CorrelationEntry[] = [
  {
    rdns: 'app.phantom',
    providerId: 'phantom',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.BITCOIN],
    walletStandardNames: ['Phantom'],
  },
  {
    rdns: 'com.trustwallet.app',
    providerId: 'trust-wallet',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA, ChainFamily.COSMOS, ChainFamily.APTOS],
    walletStandardNames: ['Trust Wallet', 'Trust'],
  },
  {
    rdns: 'io.metamask',
    providerId: 'metamask',
    chainFamilies: [ChainFamily.EVM],
    walletStandardNames: [],
  },
  {
    rdns: 'io.rabby',
    providerId: 'rabby',
    chainFamilies: [ChainFamily.EVM],
    walletStandardNames: [],
  },
  {
    rdns: 'com.coinbase.wallet',
    providerId: 'coinbase-wallet',
    chainFamilies: [ChainFamily.EVM],
    walletStandardNames: ['Coinbase Wallet'],
  },
  {
    rdns: 'sh.frame',
    providerId: 'frame',
    chainFamilies: [ChainFamily.EVM],
    walletStandardNames: [],
  },
  {
    rdns: 'com.crypto.wallet',
    providerId: 'crypto-com-onchain',
    chainFamilies: [ChainFamily.EVM],
    walletStandardNames: [],
  },
  {
    rdns: 'app.backpack',
    providerId: 'backpack',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
    walletStandardNames: ['Backpack'],
  },
  {
    rdns: 'com.exodus.browser',
    providerId: 'exodus',
    chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
    walletStandardNames: ['Exodus'],
  },
];

interface DiscoveryEvents {
  walletDiscovered: WalletDiscoveredEvent;
  walletUpdated: WalletUpdatedEvent;
  discoveryComplete: DiscoveryCompletedEvent;
}

interface InternalProviderRecord {
  wallet: DiscoveredWallet;
  eip6963Uuids: Set<string>;
  walletStandardNames: Set<string>;
}

const DISCOVERY_TIMEOUT_MS = 2500;

export class WalletDiscoveryService {
  private providers = new Map<string, InternalProviderRecord>(); // keyed by providerId
  private eip6963Uuids = new Set<string>();
  private events = new TypedEventEmitter<DiscoveryEvents>();
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private boundHandlers: { event: string; handler: (e: any) => void }[] = [];

  constructor(private win: any) {
    this.setupListeners();
  }

  private setupListeners(): void {
    const eip6963Handler = (event: any) => this.handleEIP6963Announce(event);
    const walletStandardHandler = (event: any) => this.handleWalletStandardRegister(event);

    this.win.addEventListener('eip6963:announceProvider', eip6963Handler);
    this.win.addEventListener('wallet-standard:register-wallet', walletStandardHandler);

    this.boundHandlers.push(
      { event: 'eip6963:announceProvider', handler: eip6963Handler },
      { event: 'wallet-standard:register-wallet', handler: walletStandardHandler },
    );
  }

  startDiscovery(): void {
    // Request EIP-6963 providers
    this.win.dispatchEvent(new Event('eip6963:requestProvider'));

    // Set timeout for discovery completion
    if (this.discoveryTimer) clearTimeout(this.discoveryTimer);
    this.discoveryTimer = setTimeout(() => {
      this.runFallbackDiscovery();
      this.events.emit('discoveryComplete', { wallets: this.getDiscoveredWallets() });
    }, DISCOVERY_TIMEOUT_MS);
  }

  // --- EIP-6963 Handling ---

  private handleEIP6963Announce(event: any): void {
    const info: EIP6963ProviderInfo = event.detail.info;

    // Deduplicate by UUID
    if (this.eip6963Uuids.has(info.uuid)) return;
    this.eip6963Uuids.add(info.uuid);

    // Look up correlation
    const correlationEntry = CORRELATION_REGISTRY.find(e => e.rdns === info.rdns);

    if (correlationEntry) {
      this.upsertProvider(correlationEntry.providerId, {
        providerName: info.name,
        providerIcon: info.icon,
        rdns: info.rdns,
        chainFamilies: [ChainFamily.EVM], // EIP-6963 is always EVM
        discoverySource: 'eip6963',
        eip6963Uuid: info.uuid,
      });
    } else {
      // Unknown provider - create with rdns as provisional ID
      const providerId = this.rdnsToProviderId(info.rdns);
      this.upsertProvider(providerId, {
        providerName: info.name,
        providerIcon: info.icon,
        rdns: info.rdns,
        chainFamilies: [ChainFamily.EVM],
        discoverySource: 'eip6963',
        eip6963Uuid: info.uuid,
      });
    }
  }

  // --- Wallet Standard Handling ---

  private handleWalletStandardRegister(event: any): void {
    const registerFn = event.detail?.register;
    if (typeof registerFn !== 'function') return;

    registerFn((wallet: WalletStandardWallet) => {
      const chainFamilies = this.extractChainFamiliesFromWalletStandard(wallet);

      // Try to correlate by name
      const correlationEntry = CORRELATION_REGISTRY.find(
        e => e.walletStandardNames.includes(wallet.name)
      );

      if (correlationEntry) {
        this.upsertProvider(correlationEntry.providerId, {
          providerName: wallet.name,
          providerIcon: typeof wallet.icon === 'string' ? wallet.icon : '',
          chainFamilies,
          discoverySource: 'wallet-standard',
          walletStandardName: wallet.name,
        });
      } else {
        // Unknown - create new entry
        const providerId = wallet.name.toLowerCase().replace(/\s+/g, '-') as WalletProviderId;
        this.upsertProvider(providerId, {
          providerName: wallet.name,
          providerIcon: typeof wallet.icon === 'string' ? wallet.icon : '',
          chainFamilies,
          discoverySource: 'wallet-standard',
          walletStandardName: wallet.name,
        });
      }
    });
  }

  // --- Fallback Discovery ---

  private runFallbackDiscovery(): void {
    // Fallback: window.ethereum if no EIP-6963 providers found for EVM
    if (this.win.ethereum && !this.hasProviderWithChainFamily(ChainFamily.EVM)) {
      const providerId: WalletProviderId = this.win.ethereum.isMetaMask ? 'metamask' : 'manual';
      this.upsertProvider(providerId, {
        providerName: this.win.ethereum.isMetaMask ? 'MetaMask' : 'Ethereum Wallet',
        providerIcon: '',
        chainFamilies: [ChainFamily.EVM],
        discoverySource: 'fallback',
      });
    }

    // Fallback: window.solana if no Wallet Standard providers found for Solana
    if (this.win.solana && !this.hasProviderWithChainFamily(ChainFamily.SOLANA)) {
      const providerId: WalletProviderId = this.win.solana.isPhantom ? 'phantom' : 'manual';
      this.upsertProvider(providerId, {
        providerName: this.win.solana.isPhantom ? 'Phantom' : 'Solana Wallet',
        providerIcon: '',
        chainFamilies: [ChainFamily.SOLANA],
        discoverySource: 'fallback',
      });
    }
  }

  // --- Upsert Logic ---

  private upsertProvider(
    providerId: string,
    info: {
      providerName: string;
      providerIcon: string;
      rdns?: string;
      chainFamilies: ChainFamily[];
      discoverySource: DiscoverySource;
      eip6963Uuid?: string;
      walletStandardName?: string;
    }
  ): void {
    const existing = this.providers.get(providerId);

    if (existing) {
      // Merge chain families
      const newFamilies = new Set([
        ...existing.wallet.supportedChainFamilies,
        ...info.chainFamilies,
      ]);
      existing.wallet.supportedChainFamilies = Array.from(newFamilies);
      existing.wallet.isMultiChain = existing.wallet.supportedChainFamilies.length > 1;
      if (existing.wallet.isMultiChain) {
        existing.wallet.discoverySource = 'correlated';
      }
      if (info.rdns) existing.wallet.rdns = info.rdns;
      if (info.providerIcon && !existing.wallet.providerIcon) {
        existing.wallet.providerIcon = info.providerIcon;
      }
      if (info.eip6963Uuid) existing.eip6963Uuids.add(info.eip6963Uuid);
      if (info.walletStandardName) existing.walletStandardNames.add(info.walletStandardName);

      this.events.emit('walletUpdated', { wallet: { ...existing.wallet } });
    } else {
      const wallet: DiscoveredWallet = {
        providerId: providerId as WalletProviderId,
        providerName: info.providerName,
        providerIcon: info.providerIcon,
        supportedChainFamilies: [...info.chainFamilies],
        isMultiChain: info.chainFamilies.length > 1,
        discoverySource: info.discoverySource,
        rdns: info.rdns,
      };

      const record: InternalProviderRecord = {
        wallet,
        eip6963Uuids: new Set(info.eip6963Uuid ? [info.eip6963Uuid] : []),
        walletStandardNames: new Set(info.walletStandardName ? [info.walletStandardName] : []),
      };

      this.providers.set(providerId, record);
      this.events.emit('walletDiscovered', { wallet: { ...wallet } });
    }
  }

  // --- Queries ---

  getDiscoveredWallets(): DiscoveredWallet[] {
    return Array.from(this.providers.values()).map(r => ({ ...r.wallet }));
  }

  getWalletChainFamilies(providerId: string): ChainFamily[] {
    const record = this.providers.get(providerId);
    return record ? [...record.wallet.supportedChainFamilies] : [];
  }

  // --- Events ---

  onWalletDiscovered(handler: (event: WalletDiscoveredEvent) => void): () => void {
    return this.events.on('walletDiscovered', handler);
  }

  onWalletUpdated(handler: (event: WalletUpdatedEvent) => void): () => void {
    return this.events.on('walletUpdated', handler);
  }

  onDiscoveryComplete(handler: (event: DiscoveryCompletedEvent) => void): () => void {
    return this.events.on('discoveryComplete', handler);
  }

  // --- Cleanup ---

  destroy(): void {
    for (const { event, handler } of this.boundHandlers) {
      this.win.removeEventListener(event, handler);
    }
    this.boundHandlers = [];
    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    this.events.removeAllListeners();
  }

  // --- Helpers ---

  private extractChainFamiliesFromWalletStandard(wallet: WalletStandardWallet): ChainFamily[] {
    const families = new Set<ChainFamily>();
    for (const chain of wallet.chains) {
      if (chain.startsWith('solana:')) families.add(ChainFamily.SOLANA);
      else if (chain.startsWith('sui:')) families.add(ChainFamily.SUI);
      else if (chain.startsWith('aptos:')) families.add(ChainFamily.APTOS);
      else if (chain.startsWith('cosmos:')) families.add(ChainFamily.COSMOS);
      else if (chain.startsWith('eip155:')) families.add(ChainFamily.EVM);
      else if (chain.startsWith('bip122:')) families.add(ChainFamily.BITCOIN);
    }
    return Array.from(families);
  }

  private hasProviderWithChainFamily(family: ChainFamily): boolean {
    for (const record of this.providers.values()) {
      if (record.wallet.supportedChainFamilies.includes(family)) return true;
    }
    return false;
  }

  private rdnsToProviderId(rdns: string): WalletProviderId {
    // Best-effort conversion: take last segment of rdns
    const parts = rdns.split('.');
    return parts[parts.length - 1] as WalletProviderId;
  }
}
