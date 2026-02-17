import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { TrustWalletIntegration, TRUST_WALLET_SOURCE } from './TrustWalletIntegration';
import { NetworkEnvironment } from '../../types';

function createMockEthereumProvider(overrides: Record<string, any> = {}) {
  return {
    isTrust: true,
    isTrustWallet: true,
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    ...overrides,
  };
}

describe('TrustWalletIntegration', () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = { ...globalThis.window };
    // Set up window if not available (Node environment)
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {};
    }
  });

  afterEach(() => {
    // Clean up window mocks
    delete (window as any).trustwallet;
    delete (window as any).ethereum;
    vi.restoreAllMocks();
  });

  describe('TRUST_WALLET_SOURCE constant', () => {
    it('should be defined as a string', () => {
      expect(typeof TRUST_WALLET_SOURCE).toBe('string');
      expect(TRUST_WALLET_SOURCE).toBe('TRUST_WALLET');
    });
  });

  describe('constructor', () => {
    it('should initialize with correct chain and source', () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);

      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(TRUST_WALLET_SOURCE as unknown as IntegrationSource);
    });

    it('should accept any EVM chain', () => {
      const integration = new TrustWalletIntegration(Chain.BSC);
      expect(integration.chain).toBe(Chain.BSC);
    });

    it('should throw for non-EVM chains', () => {
      expect(() => new TrustWalletIntegration(Chain.SOLANA)).toThrow();
    });

    it('should start in disconnected state', () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      expect(integration.isConnected()).toBe(false);
    });

    it('should accept optional config', () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM, {
        environment: NetworkEnvironment.TESTNET,
      });
      expect(integration).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should detect Trust Wallet via window.trustwallet.ethereum', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xabc123']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const connection = await integration.connect();

      expect(connection.connected).toBe(true);
      expect(connection.address).toBe('0xabc123');
      expect(connection.chain).toBe(Chain.ETHEREUM);
    });

    it('should detect Trust Wallet via window.ethereum.isTrust', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).ethereum = mockProvider;

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xdef456']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const connection = await integration.connect();

      expect(connection.connected).toBe(true);
      expect(connection.address).toBe('0xdef456');
    });

    it('should prefer window.trustwallet.ethereum over window.ethereum', async () => {
      const trustProvider = createMockEthereumProvider();
      const genericProvider = createMockEthereumProvider({ isTrust: false, isTrustWallet: false });

      (window as any).trustwallet = { ethereum: trustProvider };
      (window as any).ethereum = genericProvider;

      trustProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xtrust']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const connection = await integration.connect();

      expect(connection.address).toBe('0xtrust');
    });

    it('should throw if Trust Wallet is not found', async () => {
      // No ethereum or trustwallet on window
      delete (window as any).ethereum;
      delete (window as any).trustwallet;

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await expect(integration.connect()).rejects.toThrow('Trust Wallet not found');
    });

    it('should throw if window.ethereum exists but is not Trust Wallet', async () => {
      const mockProvider = createMockEthereumProvider({
        isTrust: false,
        isTrustWallet: false,
      });
      delete mockProvider.isTrust;
      delete mockProvider.isTrustWallet;
      (window as any).ethereum = mockProvider;

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await expect(integration.connect()).rejects.toThrow('Trust Wallet not found');
    });

    it('should handle multiple accounts', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa', '0xbbb', '0xccc']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const connection = await integration.connect();

      expect(connection.accounts).toHaveLength(3);
      expect(connection.accounts![0].address).toBe('0xaaa');
      expect(connection.accounts![1].address).toBe('0xbbb');
      expect(connection.accounts![2].address).toBe('0xccc');
      expect(connection.activeAccount?.address).toBe('0xaaa');
    });

    it('should return cached connection on subsequent calls', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const conn1 = await integration.connect();
      const conn2 = await integration.connect();

      expect(conn1).toBe(conn2);
    });

    it('should switch chain if needed', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x5'); // Wrong chain
        if (args.method === 'wallet_switchEthereumChain') return Promise.resolve(null);
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const connection = await integration.connect();

      expect(connection.connected).toBe(true);
      expect(mockProvider.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'wallet_switchEthereumChain' })
      );
    });
  });

  describe('disconnect', () => {
    it('should set connected to false', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();
      expect(integration.isConnected()).toBe(true);

      await integration.disconnect();
      expect(integration.isConnected()).toBe(false);
    });

    it('should clear accounts after disconnect', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();
      await integration.disconnect();

      await expect(integration.getAddress()).rejects.toThrow();
    });
  });

  describe('getAddress', () => {
    it('should return active account address', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa', '0xbbb']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();

      const address = await integration.getAddress();
      expect(address).toBe('0xaaa');
    });

    it('should throw when not connected', async () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await expect(integration.getAddress()).rejects.toThrow('Wallet not connected');
    });
  });

  describe('getAllAccounts', () => {
    it('should return all connected accounts', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa', '0xbbb']);
        if (args.method === 'eth_accounts')
          return Promise.resolve(['0xaaa', '0xbbb']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();

      const accounts = await integration.getAllAccounts();
      expect(accounts).toHaveLength(2);
    });

    it('should throw when not connected', async () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await expect(integration.getAllAccounts()).rejects.toThrow('Wallet not connected');
    });
  });

  describe('switchAccount', () => {
    it('should switch to a valid account', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa', '0xbbb']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();

      await integration.switchAccount('0xbbb');
      const address = await integration.getAddress();
      expect(address).toBe('0xbbb');
    });

    it('should throw for unknown account', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();

      await expect(integration.switchAccount('0xzzz')).rejects.toThrow();
    });

    it('should throw when not connected', async () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await expect(integration.switchAccount('0xaaa')).rejects.toThrow('Wallet not connected');
    });
  });

  describe('getActiveAccount', () => {
    it('should return active account when connected', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();

      const account = await integration.getActiveAccount();
      expect(account).not.toBeNull();
      expect(account?.address).toBe('0xaaa');
    });

    it('should return null when not connected', async () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      const account = await integration.getActiveAccount();
      expect(account).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      expect(integration.isConnected()).toBe(false);
    });

    it('should return true after connecting', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();
      expect(integration.isConnected()).toBe(true);
    });

    it('should return false after disconnecting', async () => {
      const mockProvider = createMockEthereumProvider();
      (window as any).trustwallet = { ethereum: mockProvider };

      mockProvider.request.mockImplementation((args: any) => {
        if (args.method === 'eth_chainId') return Promise.resolve('0x1');
        if (args.method === 'eth_requestAccounts')
          return Promise.resolve(['0xaaa']);
        return Promise.resolve(null);
      });

      const integration = new TrustWalletIntegration(Chain.ETHEREUM);
      await integration.connect();
      await integration.disconnect();
      expect(integration.isConnected()).toBe(false);
    });
  });
});
