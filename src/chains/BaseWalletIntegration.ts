import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import {
  WalletIntegration,
  WalletConnection,
  Account,
  WalletIntegrationConfig
} from '../types';
import { WalletNotConnectedError, AccountNotFoundError } from '../errors/WalletErrors';

/**
 * BaseWalletIntegration Abstract Class
 *
 * Provides common functionality for all wallet integrations using the Template Method pattern.
 * Chain-specific implementations extend this class and implement abstract methods.
 *
 * @remarks
 * This abstract class implements the WalletIntegration interface and provides:
 * - Connection state management
 * - Account list management
 * - Active account tracking
 * - Template methods for chain-specific operations
 *
 * Subclasses must implement:
 * - connectToProvider(): Actual connection logic
 * - disconnectFromProvider(): Actual disconnection logic
 * - getAccountsFromProvider(): Fetch accounts from wallet extension
 *
 * @example
 * ```typescript
 * class MyChainIntegration extends BaseWalletIntegration {
 *   protected async connectToProvider(): Promise<Account[]> {
 *     // Chain-specific connection
 *     const accounts = await window.myWallet.connect();
 *     return this.mapToAccounts(accounts);
 *   }
 *
 *   protected async disconnectFromProvider(): Promise<void> {
 *     await window.myWallet.disconnect();
 *   }
 *
 *   protected async getAccountsFromProvider(): Promise<Account[]> {
 *     const accounts = await window.myWallet.getAccounts();
 *     return this.mapToAccounts(accounts);
 *   }
 * }
 * ```
 *
 * @contractTest Connect - First Time
 * GIVEN a new integration instance (not connected)
 * WHEN connect() is called
 * THEN should call connectToProvider()
 * AND should set connected to true
 * AND should store accounts
 * AND should return WalletConnection with accounts
 *
 * @contractTest Connect - Already Connected
 * GIVEN an already connected integration
 * WHEN connect() is called
 * THEN should return existing connection without calling connectToProvider()
 *
 * @contractTest Disconnect - When Connected
 * GIVEN a connected integration
 * WHEN disconnect() is called
 * THEN should call disconnectFromProvider()
 * AND should set connected to false
 * AND should clear accounts
 *
 * @contractTest Disconnect - When Not Connected
 * GIVEN a non-connected integration
 * WHEN disconnect() is called
 * THEN should not call disconnectFromProvider()
 * AND should complete without error
 *
 * @contractTest Get Address - When Connected
 * GIVEN a connected integration with accounts
 * WHEN getAddress() is called
 * THEN should return active account's address
 *
 * @contractTest Get Address - When Not Connected
 * GIVEN a non-connected integration
 * WHEN getAddress() is called
 * THEN should throw WalletNotConnectedError
 *
 * @contractTest Get All Accounts - When Connected
 * GIVEN a connected integration
 * WHEN getAllAccounts() is called
 * THEN should call getAccountsFromProvider() to get fresh data
 * AND should update stored accounts
 * AND should return account list
 *
 * @contractTest Get All Accounts - When Not Connected
 * GIVEN a non-connected integration
 * WHEN getAllAccounts() is called
 * THEN should throw WalletNotConnectedError
 *
 * @contractTest Switch Account - Valid Address
 * GIVEN a connected integration with multiple accounts
 * WHEN switchAccount(validAddress) is called
 * THEN should update activeAccountIndex
 * AND should not throw error
 *
 * @contractTest Switch Account - Invalid Address
 * GIVEN a connected integration
 * WHEN switchAccount(unknownAddress) is called
 * THEN should throw AccountNotFoundError with available accounts
 *
 * @contractTest Switch Account - When Not Connected
 * GIVEN a non-connected integration
 * WHEN switchAccount() is called
 * THEN should throw WalletNotConnectedError
 *
 * @contractTest Get Active Account - When Connected
 * GIVEN a connected integration
 * WHEN getActiveAccount() is called
 * THEN should return account at activeAccountIndex
 *
 * @contractTest Get Active Account - When Not Connected
 * GIVEN a non-connected integration
 * WHEN getActiveAccount() is called
 * THEN should return null
 *
 * @contractTest Is Connected - True
 * GIVEN a connected integration
 * WHEN isConnected() is called
 * THEN should return true
 *
 * @contractTest Is Connected - False
 * GIVEN a non-connected integration
 * WHEN isConnected() is called
 * THEN should return false
 */
export abstract class BaseWalletIntegration implements WalletIntegration {
  /**
   * Connection state
   */
  protected connected: boolean = false;

  /**
   * List of accounts
   */
  protected accounts: Account[] = [];

  /**
   * Index of active account
   */
  protected activeAccountIndex: number = 0;

  /**
   * Last successful connection (for returning cached connection)
   */
  protected lastConnection: WalletConnection | null = null;

  /**
   * Creates a new BaseWalletIntegration
   *
   * @param chain - The blockchain this integration is for
   * @param source - The wallet extension source
   * @param config - Optional configuration
   *
   * @implementation
   * Store chain, source, and config as readonly properties
   */
  constructor(
    public readonly chain: Chain,
    public readonly source: IntegrationSource,
    protected readonly config?: WalletIntegrationConfig
  ) {}

  /**
   * Connects to the wallet extension
   *
   * @returns WalletConnection with account information
   * @throws {WalletExtensionNotFoundError} If wallet extension is not available
   *
   * @implementation
   * 1. If already connected and lastConnection exists, return lastConnection
   * 2. Call connectToProvider() to perform chain-specific connection
   * 3. Set connected = true
   * 4. Store returned accounts
   * 5. Set activeAccountIndex = 0
   * 6. Build WalletConnection object
   * 7. Store as lastConnection
   * 8. Return connection
   */
  async connect(): Promise<WalletConnection> {
    // 1. If already connected and lastConnection exists, return lastConnection
    if (this.connected && this.lastConnection) {
      return this.lastConnection;
    }

    // 2. Call connectToProvider() to perform chain-specific connection
    const accounts = await this.connectToProvider();

    // 3. Set connected = true
    this.connected = true;

    // 4. Store returned accounts
    this.accounts = accounts;

    // 5. Set activeAccountIndex = 0
    this.activeAccountIndex = 0;

    // 6. Build WalletConnection object
    const connection = this.buildConnection();

    // 7. Store as lastConnection
    this.lastConnection = connection;

    // 8. Return connection
    return connection;
  }

  /**
   * Disconnects from the wallet extension
   *
   * @implementation
   * 1. If not connected, return early
   * 2. Call disconnectFromProvider() to perform chain-specific disconnection
   * 3. Set connected = false
   * 4. Clear accounts array
   * 5. Reset activeAccountIndex = 0
   * 6. Clear lastConnection
   */
  async disconnect(): Promise<void> {
    // 1. If not connected, return early
    if (!this.connected) {
      return;
    }

    // 2. Call disconnectFromProvider() to perform chain-specific disconnection
    await this.disconnectFromProvider();

    // 3. Set connected = false
    this.connected = false;

    // 4. Clear accounts array
    this.accounts = [];

    // 5. Reset activeAccountIndex = 0
    this.activeAccountIndex = 0;

    // 6. Clear lastConnection
    this.lastConnection = null;
  }

  /**
   * Gets the current active account address
   *
   * @returns The active account address
   * @throws {WalletNotConnectedError} If wallet is not connected
   *
   * @implementation
   * 1. Check if connected, throw WalletNotConnectedError if not
   * 2. Check if accounts array has items, throw error if empty
   * 3. Return accounts[activeAccountIndex].address
   */
  async getAddress(): Promise<string> {
    // 1. Check if connected, throw WalletNotConnectedError if not
    if (!this.connected) {
      throw new WalletNotConnectedError(this.chain);
    }

    // 2. Check if accounts array has items, throw error if empty
    if (this.accounts.length === 0) {
      throw new WalletNotConnectedError(this.chain);
    }

    // 3. Return accounts[activeAccountIndex].address
    return this.accounts[this.activeAccountIndex].address;
  }

  /**
   * Gets all accounts from the wallet
   *
   * @returns Array of all accounts
   * @throws {WalletNotConnectedError} If wallet is not connected
   *
   * @implementation
   * 1. Check if connected, throw WalletNotConnectedError if not
   * 2. Call getAccountsFromProvider() to get fresh account list
   * 3. Update this.accounts with fresh data
   * 4. Return copy of accounts array
   */
  async getAllAccounts(): Promise<Account[]> {
    // 1. Check if connected, throw WalletNotConnectedError if not
    if (!this.connected) {
      throw new WalletNotConnectedError(this.chain);
    }

    // 2. Call getAccountsFromProvider() to get fresh account list
    const freshAccounts = await this.getAccountsFromProvider();

    // 3. Update this.accounts with fresh data
    this.accounts = freshAccounts;

    // 4. Return copy of accounts array
    return [...this.accounts];
  }

  /**
   * Switches to a different account
   *
   * @param address - The address to switch to
   * @throws {WalletNotConnectedError} If wallet is not connected
   * @throws {AccountNotFoundError} If address is not found
   *
   * @implementation
   * 1. Check if connected, throw WalletNotConnectedError if not
   * 2. Find account index by address (case-insensitive)
   * 3. If not found, throw AccountNotFoundError with available addresses
   * 4. Set activeAccountIndex to found index
   */
  async switchAccount(address: string): Promise<void> {
    // 1. Check if connected, throw WalletNotConnectedError if not
    if (!this.connected) {
      throw new WalletNotConnectedError(this.chain);
    }

    // 2. Find account index by address (case-insensitive)
    const index = this.findAccountIndex(address);

    // 3. If not found, throw AccountNotFoundError with available addresses
    if (index === -1) {
      const availableAddresses = this.accounts.map(acc => acc.address);
      throw new AccountNotFoundError(address, availableAddresses);
    }

    // 4. Set activeAccountIndex to found index
    this.activeAccountIndex = index;
  }

  /**
   * Gets the active account
   *
   * @returns The active account or null if not connected
   *
   * @implementation
   * 1. If not connected, return null
   * 2. If accounts is empty, return null
   * 3. Return accounts[activeAccountIndex]
   */
  async getActiveAccount(): Promise<Account | null> {
    // 1. If not connected, return null
    if (!this.connected) {
      return null;
    }

    // 2. If accounts is empty, return null
    if (this.accounts.length === 0) {
      return null;
    }

    // 3. Return accounts[activeAccountIndex]
    return this.accounts[this.activeAccountIndex];
  }

  /**
   * Checks if wallet is connected
   *
   * @returns true if connected, false otherwise
   *
   * @implementation
   * Return this.connected
   */
  isConnected(): boolean {
    // Return this.connected
    return this.connected;
  }

  /**
   * Performs chain-specific connection logic
   *
   * @returns Array of accounts from the wallet
   * @throws {WalletExtensionNotFoundError} If extension is not available
   *
   * @abstract Must be implemented by subclasses
   *
   * @remarks
   * Subclasses should:
   * 1. Check if wallet extension exists (window.ethereum, window.solana, etc.)
   * 2. Request connection/permissions
   * 3. Fetch account list
   * 4. Return accounts in standard Account format
   */
  protected abstract connectToProvider(): Promise<Account[]>;

  /**
   * Performs chain-specific disconnection logic
   *
   * @abstract Must be implemented by subclasses
   *
   * @remarks
   * Subclasses should clean up any chain-specific resources or state
   */
  protected abstract disconnectFromProvider(): Promise<void>;

  /**
   * Fetches current accounts from wallet extension
   *
   * @returns Array of current accounts
   *
   * @abstract Must be implemented by subclasses
   *
   * @remarks
   * This should fetch the latest account list without requesting new permissions.
   * Used for refreshing account data.
   */
  protected abstract getAccountsFromProvider(): Promise<Account[]>;

  /**
   * Helper to find account index by address (case-insensitive)
   *
   * @param address - Address to find
   * @returns Index of account or -1 if not found
   *
   * @implementation
   * 1. Normalize search address to lowercase
   * 2. Use Array.findIndex with case-insensitive comparison
   * 3. Return index
   *
   * @protected
   */
  protected findAccountIndex(address: string): number {
    // 1. Normalize search address to lowercase
    const normalizedAddress = address.toLowerCase();

    // 2. Use Array.findIndex with case-insensitive comparison
    const index = this.accounts.findIndex(
      account => account.address.toLowerCase() === normalizedAddress
    );

    // 3. Return index
    return index;
  }

  /**
   * Helper to build WalletConnection object
   *
   * @returns WalletConnection object with current state
   *
   * @implementation
   * Return object with:
   * - address: active account address
   * - chain: this.chain
   * - source: this.source
   * - connected: this.connected
   * - connectedAt: new Date()
   * - accounts: copy of this.accounts
   * - activeAccount: this.accounts[activeAccountIndex]
   *
   * @protected
   */
  protected buildConnection(): WalletConnection {
    // Return object with:
    // - address: active account address
    // - chain: this.chain
    // - source: this.source
    // - connected: this.connected
    // - connectedAt: new Date()
    // - accounts: copy of this.accounts
    // - activeAccount: this.accounts[activeAccountIndex]
    return {
      address: this.accounts[this.activeAccountIndex].address,
      chain: this.chain,
      source: this.source,
      connected: this.connected,
      connectedAt: new Date(),
      accounts: [...this.accounts],
      activeAccount: this.accounts[this.activeAccountIndex]
    };
  }
}
