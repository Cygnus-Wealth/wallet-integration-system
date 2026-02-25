import { describe, it, expect } from 'vitest';
import { Chain, ChainFamily } from '@cygnus-wealth/data-models';
import {
  type WalletProviderId,
  type WalletConnectionId,
  type AccountId,
  type ConnectedAccount,
  type WatchAddress,
  type AccountGroup,
  type TrackedAddress,
  type AccountMetadata,
  type SessionStatus,
  type AccountSource,
  createWalletConnectionId,
  createAccountId,
  createWatchAccountId,
  parseAccountId,
  parseWalletConnectionId,
  WALLET_PROVIDER_IDS,
} from './multi-wallet';
import type { MultiWalletConnection } from './multi-wallet';

describe('Multi-Wallet Multi-Account Types', () => {
  describe('WalletProviderId', () => {
    it('should include all expected provider IDs', () => {
      expect(WALLET_PROVIDER_IDS).toContain('metamask');
      expect(WALLET_PROVIDER_IDS).toContain('rabby');
      expect(WALLET_PROVIDER_IDS).toContain('walletconnect');
      expect(WALLET_PROVIDER_IDS).toContain('coinbase-wallet');
      expect(WALLET_PROVIDER_IDS).toContain('trust-wallet');
      expect(WALLET_PROVIDER_IDS).toContain('frame');
      expect(WALLET_PROVIDER_IDS).toContain('crypto-com-onchain');
      expect(WALLET_PROVIDER_IDS).toContain('phantom');
      expect(WALLET_PROVIDER_IDS).toContain('solflare');
      expect(WALLET_PROVIDER_IDS).toContain('backpack');
      expect(WALLET_PROVIDER_IDS).toContain('exodus');
      expect(WALLET_PROVIDER_IDS).toContain('manual');
    });
  });

  describe('createWalletConnectionId', () => {
    it('should create ID in format providerId:randomId', () => {
      const id = createWalletConnectionId('metamask');
      expect(id).toMatch(/^metamask:[a-z0-9]+$/);
    });

    it('should create unique IDs for same provider', () => {
      const id1 = createWalletConnectionId('metamask');
      const id2 = createWalletConnectionId('metamask');
      expect(id1).not.toBe(id2);
    });
  });

  describe('parseWalletConnectionId', () => {
    it('should parse provider and random ID from connection ID', () => {
      const id = createWalletConnectionId('rabby');
      const parsed = parseWalletConnectionId(id);
      expect(parsed.providerId).toBe('rabby');
      expect(parsed.randomId).toBeTruthy();
    });
  });

  describe('createAccountId', () => {
    it('should create ID in format connectionId:chainFamily:checksummedAddress', () => {
      const connectionId = createWalletConnectionId('metamask');
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const accountId = createAccountId(connectionId, ChainFamily.EVM, address);
      expect(accountId).toBe(`${connectionId}:evm:${address}`);
    });

    it('should include solana chain family segment', () => {
      const connectionId = createWalletConnectionId('phantom');
      const address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const accountId = createAccountId(connectionId, ChainFamily.SOLANA, address);
      expect(accountId).toContain(':solana:');
    });
  });

  describe('createWatchAccountId', () => {
    it('should create ID in format watch:checksummedAddress', () => {
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const accountId = createWatchAccountId(address);
      expect(accountId).toBe(`watch:${address}`);
    });
  });

  describe('parseAccountId', () => {
    it('should parse connected account ID with chainFamily', () => {
      const connectionId = 'metamask:abc123' as WalletConnectionId;
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const accountId = `${connectionId}:evm:${address}` as AccountId;
      const parsed = parseAccountId(accountId);
      expect(parsed.walletConnectionId).toBe(connectionId);
      expect(parsed.chainFamily).toBe(ChainFamily.EVM);
      expect(parsed.address).toBe(address);
      expect(parsed.isWatch).toBe(false);
    });

    it('should parse Solana account ID', () => {
      const connectionId = 'phantom:xyz789' as WalletConnectionId;
      const address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const accountId = `${connectionId}:solana:${address}` as AccountId;
      const parsed = parseAccountId(accountId);
      expect(parsed.walletConnectionId).toBe(connectionId);
      expect(parsed.chainFamily).toBe(ChainFamily.SOLANA);
      expect(parsed.address).toBe(address);
      expect(parsed.isWatch).toBe(false);
    });

    it('should parse watch account ID', () => {
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const accountId = `watch:${address}` as AccountId;
      const parsed = parseAccountId(accountId);
      expect(parsed.walletConnectionId).toBe('watch');
      expect(parsed.address).toBe(address);
      expect(parsed.isWatch).toBe(true);
      expect(parsed.chainFamily).toBeUndefined();
    });
  });

  describe('Type structure validation', () => {
    it('should create a valid ConnectedAccount with chainFamily', () => {
      const account: ConnectedAccount = {
        accountId: 'metamask:abc123:evm:0x1234567890123456789012345678901234567890' as AccountId,
        address: '0x1234567890123456789012345678901234567890',
        accountLabel: 'Main Account',
        chainFamily: ChainFamily.EVM,
        chainScope: [Chain.ETHEREUM, Chain.POLYGON],
        source: 'provider',
        discoveredAt: new Date().toISOString(),
        isStale: false,
        isActive: true,
      };
      expect(account.accountId).toContain('metamask');
      expect(account.chainFamily).toBe(ChainFamily.EVM);
      expect(account.source).toBe('provider');
      expect(account.chainScope).toHaveLength(2);
    });

    it('should create a valid MultiWalletConnection with chain families', () => {
      const connection: MultiWalletConnection = {
        connectionId: 'metamask:abc123' as WalletConnectionId,
        providerId: 'metamask',
        providerName: 'MetaMask',
        providerIcon: 'metamask-icon',
        connectionLabel: 'My MetaMask',
        accounts: [],
        activeAccountAddress: null,
        supportedChains: [Chain.ETHEREUM],
        supportedChainFamilies: [ChainFamily.EVM],
        connectedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        sessionStatus: 'active',
      };
      expect(connection.connectionId).toContain('metamask');
      expect(connection.sessionStatus).toBe('active');
      expect(connection.supportedChainFamilies).toEqual([ChainFamily.EVM]);
    });

    it('should create a valid WatchAddress with chainFamily', () => {
      const watch: WatchAddress = {
        accountId: 'watch:0x1234567890123456789012345678901234567890' as AccountId,
        address: '0x1234567890123456789012345678901234567890',
        addressLabel: 'Vitalik',
        chainFamily: ChainFamily.EVM,
        chainScope: [Chain.ETHEREUM],
        addedAt: new Date().toISOString(),
      };
      expect(watch.accountId).toContain('watch:');
      expect(watch.chainFamily).toBe(ChainFamily.EVM);
    });

    it('should create a valid AccountGroup', () => {
      const group: AccountGroup = {
        groupId: 'group-1',
        groupName: 'DeFi Accounts',
        accountIds: [
          'metamask:abc123:0x1234567890123456789012345678901234567890' as AccountId,
          'watch:0x2345678901234567890123456789012345678901' as AccountId,
        ],
        createdAt: new Date().toISOString(),
      };
      expect(group.accountIds).toHaveLength(2);
    });

    it('should create a valid TrackedAddress with chainFamily', () => {
      const tracked: TrackedAddress = {
        accountId: 'metamask:abc123:evm:0x1234567890123456789012345678901234567890' as AccountId,
        address: '0x1234567890123456789012345678901234567890',
        walletConnectionId: 'metamask:abc123' as WalletConnectionId,
        providerId: 'metamask',
        accountLabel: 'Main',
        connectionLabel: 'My MetaMask',
        chainFamily: ChainFamily.EVM,
        chainScope: [Chain.ETHEREUM, Chain.POLYGON],
      };
      expect(tracked.providerId).toBe('metamask');
      expect(tracked.chainFamily).toBe(ChainFamily.EVM);
    });

    it('should create a valid TrackedAddress for watch address with chainFamily', () => {
      const tracked: TrackedAddress = {
        accountId: 'watch:0x1234567890123456789012345678901234567890' as AccountId,
        address: '0x1234567890123456789012345678901234567890',
        walletConnectionId: 'watch',
        providerId: 'watch',
        accountLabel: 'Vitalik',
        connectionLabel: '',
        chainFamily: ChainFamily.EVM,
        chainScope: [Chain.ETHEREUM],
      };
      expect(tracked.walletConnectionId).toBe('watch');
      expect(tracked.chainFamily).toBe(ChainFamily.EVM);
    });

    it('should create a valid AccountMetadata', () => {
      const metadata: AccountMetadata = {
        accountId: 'metamask:abc123:0x1234567890123456789012345678901234567890' as AccountId,
        address: '0x1234567890123456789012345678901234567890',
        accountLabel: 'Main',
        connectionLabel: 'My MetaMask',
        providerId: 'metamask',
        walletConnectionId: 'metamask:abc123' as WalletConnectionId,
        groups: ['group-1'],
        discoveredAt: new Date().toISOString(),
        isStale: false,
        isActive: true,
      };
      expect(metadata.groups).toHaveLength(1);
    });
  });
});
