import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chain, ChainFamily } from '@cygnus-wealth/data-models';
import { WalletConnectionService } from './WalletConnectionService';
import { WalletIntegrationService } from './WalletIntegrationService';
import type {
  WalletConnectionId,
  AccountId,
  TrackedAddress,
  AccountMetadata,
} from '../types/multi-wallet';

describe('WalletIntegrationService', () => {
  let connectionService: WalletConnectionService;
  let integrationService: WalletIntegrationService;

  beforeEach(() => {
    connectionService = new WalletConnectionService();
    integrationService = new WalletIntegrationService(connectionService);
  });

  function connectMetaMask(addresses: string[] = ['0x1111111111111111111111111111111111111111']) {
    return connectionService.connectWallet('metamask', addresses, {
      providerName: 'MetaMask',
      providerIcon: 'mm-icon',
      supportedChains: [Chain.ETHEREUM, Chain.POLYGON],
    });
  }

  function connectRabby(addresses: string[] = ['0x2222222222222222222222222222222222222222']) {
    return connectionService.connectWallet('rabby', addresses, {
      providerName: 'Rabby',
      providerIcon: 'rabby-icon',
      supportedChains: [Chain.ETHEREUM, Chain.ARBITRUM],
    });
  }

  // --- getTrackedAddresses ---

  describe('getTrackedAddresses', () => {
    it('should return tracked addresses from all connections', () => {
      connectMetaMask();
      connectRabby();

      const tracked = integrationService.getTrackedAddresses();
      expect(tracked).toHaveLength(2);
    });

    it('should include watch addresses', () => {
      connectMetaMask();
      connectionService.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Watched',
        [Chain.ETHEREUM]
      );

      const tracked = integrationService.getTrackedAddresses();
      expect(tracked).toHaveLength(2);
      const watchAddr = tracked.find(t => t.providerId === 'watch');
      expect(watchAddr).toBeDefined();
      expect(watchAddr!.walletConnectionId).toBe('watch');
    });

    it('should include correct metadata in TrackedAddress', () => {
      const connection = connectMetaMask(['0x1111111111111111111111111111111111111111']);
      connectionService.setConnectionLabel(connection.connectionId, 'My MM');
      connectionService.setAccountLabel(connection.accounts[0].accountId, 'Main');

      const tracked = integrationService.getTrackedAddresses();
      expect(tracked[0].accountLabel).toBe('Main');
      expect(tracked[0].connectionLabel).toBe('My MM');
      expect(tracked[0].providerId).toBe('metamask');
      expect(tracked[0].chainScope).toEqual([Chain.ETHEREUM, Chain.POLYGON]);
    });
  });

  // --- getTrackedAddressesByChain ---

  describe('getTrackedAddressesByChain', () => {
    it('should filter tracked addresses by chain', () => {
      connectMetaMask(); // Ethereum, Polygon
      connectRabby();    // Ethereum, Arbitrum

      const ethAddresses = integrationService.getTrackedAddressesByChain(Chain.ETHEREUM);
      expect(ethAddresses).toHaveLength(2);

      const polyAddresses = integrationService.getTrackedAddressesByChain(Chain.POLYGON);
      expect(polyAddresses).toHaveLength(1);

      const arbAddresses = integrationService.getTrackedAddressesByChain(Chain.ARBITRUM);
      expect(arbAddresses).toHaveLength(1);

      const bscAddresses = integrationService.getTrackedAddressesByChain(Chain.BSC);
      expect(bscAddresses).toHaveLength(0);
    });
  });

  // --- getTrackedAddressesByWallet ---

  describe('getTrackedAddressesByWallet', () => {
    it('should return only addresses from specified wallet connection', () => {
      const mm = connectMetaMask(['0x1111111111111111111111111111111111111111', '0x3333333333333333333333333333333333333333']);
      connectRabby();

      const mmAddresses = integrationService.getTrackedAddressesByWallet(mm.connectionId);
      expect(mmAddresses).toHaveLength(2);
      expect(mmAddresses.every(a => a.walletConnectionId === mm.connectionId)).toBe(true);
    });
  });

  // --- getTrackedAddressesByGroup ---

  describe('getTrackedAddressesByGroup', () => {
    it('should return tracked addresses for accounts in a group', () => {
      const mm = connectMetaMask(['0x1111111111111111111111111111111111111111', '0x3333333333333333333333333333333333333333']);
      const rabby = connectRabby();

      const group = connectionService.createAccountGroup('DeFi', [
        mm.accounts[0].accountId,
        rabby.accounts[0].accountId,
      ]);

      const groupAddresses = integrationService.getTrackedAddressesByGroup(group.groupId);
      expect(groupAddresses).toHaveLength(2);
    });

    it('should return empty for unknown group', () => {
      const result = integrationService.getTrackedAddressesByGroup('non-existent');
      expect(result).toHaveLength(0);
    });
  });

  // --- getAccountMetadata ---

  describe('getAccountMetadata', () => {
    it('should return full metadata for a connected account', () => {
      const mm = connectMetaMask();
      const group = connectionService.createAccountGroup('Test', [mm.accounts[0].accountId]);

      const metadata = integrationService.getAccountMetadata(mm.accounts[0].accountId);
      expect(metadata.accountId).toBe(mm.accounts[0].accountId);
      expect(metadata.address).toBe('0x1111111111111111111111111111111111111111');
      expect(metadata.providerId).toBe('metamask');
      expect(metadata.walletConnectionId).toBe(mm.connectionId);
      expect(metadata.groups).toContain(group.groupId);
      expect(metadata.isStale).toBe(false);
      expect(metadata.isActive).toBe(true);
    });

    it('should return metadata for a watch address', () => {
      const watch = connectionService.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Vitalik',
        [Chain.ETHEREUM]
      );

      const metadata = integrationService.getAccountMetadata(watch.accountId);
      expect(metadata.providerId).toBe('watch');
      expect(metadata.walletConnectionId).toBe('watch');
      expect(metadata.accountLabel).toBe('Vitalik');
      expect(metadata.isStale).toBe(false);
      expect(metadata.isActive).toBe(false);
    });

    it('should throw for unknown account', () => {
      expect(() => integrationService.getAccountMetadata('unknown:id' as AccountId))
        .toThrow();
    });
  });

  // --- Events ---

  describe('onAddressAdded', () => {
    it('should emit when a new wallet connection account is discovered', () => {
      const handler = vi.fn();
      integrationService.onAddressAdded(handler);

      connectMetaMask();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        trackedAddress: expect.objectContaining({
          providerId: 'metamask',
          address: '0x1111111111111111111111111111111111111111',
        }),
      }));
    });

    it('should emit when a watch address is added', () => {
      const handler = vi.fn();
      integrationService.onAddressAdded(handler);

      connectionService.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Watch',
        [Chain.ETHEREUM]
      );

      // Watch addresses are tracked but the event is emitted by integration service
      // watching the connection service state
      expect(handler).toHaveBeenCalled();
    });

    it('should emit when accounts accumulate via accountsChanged', () => {
      const handler = vi.fn();
      integrationService.onAddressAdded(handler);

      const mm = connectMetaMask();
      handler.mockClear();

      connectionService.handleAccountsChanged(mm.connectionId, [
        '0x4444444444444444444444444444444444444444',
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        trackedAddress: expect.objectContaining({
          address: '0x4444444444444444444444444444444444444444',
        }),
      }));
    });
  });

  describe('onAddressRemoved', () => {
    it('should emit when an account is removed', () => {
      const handler = vi.fn();
      integrationService.onAddressRemoved(handler);

      const mm = connectMetaMask();
      const accountId = mm.accounts[0].accountId;
      connectionService.removeAccount(accountId);

      expect(handler).toHaveBeenCalledWith({ accountId });
    });
  });

  describe('onAddressChainScopeChanged', () => {
    it('should emit when chain scope changes', () => {
      const handler = vi.fn();
      integrationService.onAddressChainScopeChanged(handler);

      const mm = connectMetaMask();
      connectionService.setAccountChainScope(mm.accounts[0].accountId, [Chain.ETHEREUM]);

      expect(handler).toHaveBeenCalledWith({
        accountId: mm.accounts[0].accountId,
        chains: [Chain.ETHEREUM],
      });
    });
  });

  // --- Chain Family Queries (en-o8w) ---

  describe('getTrackedAddressesByChainFamily', () => {
    it('should filter tracked addresses by chain family', () => {
      connectionService.connectWallet('phantom', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'Phantom',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM],
        chainFamilies: [ChainFamily.EVM],
      });

      connectionService.connectWallet('phantom', ['7x9yZsolanaAddress1234567890123456789012345'], {
        providerName: 'Phantom',
        providerIcon: '',
        supportedChains: [Chain.SOLANA],
        chainFamilies: [ChainFamily.SOLANA],
      });

      const evmAddresses = integrationService.getTrackedAddressesByChainFamily(ChainFamily.EVM);
      expect(evmAddresses).toHaveLength(1);
      expect(evmAddresses[0].chainFamily).toBe(ChainFamily.EVM);

      const solAddresses = integrationService.getTrackedAddressesByChainFamily(ChainFamily.SOLANA);
      expect(solAddresses).toHaveLength(1);
      expect(solAddresses[0].chainFamily).toBe(ChainFamily.SOLANA);
    });

    it('should return empty for unconnected chain family', () => {
      connectMetaMask();
      const suiAddresses = integrationService.getTrackedAddressesByChainFamily(ChainFamily.SUI);
      expect(suiAddresses).toHaveLength(0);
    });
  });

  describe('getConnectionChainFamilies', () => {
    it('should return chain families for a connection', () => {
      const mm = connectionService.connectWallet('phantom', ['0x1111111111111111111111111111111111111111'], {
        providerName: 'Phantom',
        providerIcon: '',
        supportedChains: [Chain.ETHEREUM, Chain.SOLANA],
        chainFamilies: [ChainFamily.EVM, ChainFamily.SOLANA],
      });

      const families = integrationService.getConnectionChainFamilies(mm.connectionId);
      expect(families).toContain(ChainFamily.EVM);
      expect(families).toContain(ChainFamily.SOLANA);
    });
  });

  describe('TrackedAddress chainFamily field', () => {
    it('should include chainFamily in tracked addresses', () => {
      connectMetaMask();
      const tracked = integrationService.getTrackedAddresses();
      expect(tracked[0].chainFamily).toBe(ChainFamily.EVM);
    });

    it('should include chainFamily in watch address tracked addresses', () => {
      connectionService.addWatchAddress(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Watched',
        [Chain.ETHEREUM],
        ChainFamily.EVM
      );

      const tracked = integrationService.getTrackedAddresses();
      const watchAddr = tracked.find(t => t.providerId === 'watch');
      expect(watchAddr!.chainFamily).toBe(ChainFamily.EVM);
    });
  });

  describe('getAccountMetadata with chainFamily', () => {
    it('should include chainFamily in account metadata', () => {
      const mm = connectMetaMask();
      const metadata = integrationService.getAccountMetadata(mm.accounts[0].accountId);
      expect(metadata.chainFamily).toBe(ChainFamily.EVM);
    });
  });

  // --- Cleanup ---

  describe('destroy', () => {
    it('should clean up all listeners', () => {
      const handler = vi.fn();
      integrationService.onAddressAdded(handler);
      integrationService.destroy();

      connectMetaMask();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
