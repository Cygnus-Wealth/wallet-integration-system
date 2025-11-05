/**
 * Infrastructure-Level Error Types for Wallet Integration System
 *
 * These error classes provide structured error information for better error handling
 * and more informative error messages throughout the application.
 *
 * @remarks
 * All error classes extend Error and include:
 * - Descriptive error messages
 * - Contextual information (e.g., wallet ID, chain, address)
 * - Proper prototype chain setup for instanceof checks
 */

/**
 * Error thrown when a wallet ID is not found in the system
 */
export class WalletNotFoundError extends Error {
  /**
   * The wallet ID that was not found
   * @readonly
   */
  readonly walletId: string;

  /**
   * Creates a new WalletNotFoundError
   *
   * @param walletId - The wallet ID that was not found
   */
  constructor(walletId: string) {
    super(`Wallet not found: ${walletId}`);
    this.name = 'WalletNotFoundError';
    this.walletId = walletId;
    Object.setPrototypeOf(this, WalletNotFoundError.prototype);
  }
}

/**
 * Error thrown when attempting to use an unsupported blockchain
 */
export class ChainNotSupportedError extends Error {
  /**
   * The unsupported chain
   * @readonly
   */
  readonly chain: string;

  /**
   * List of supported chains
   * @readonly
   */
  readonly supportedChains: readonly string[];

  /**
   * Creates a new ChainNotSupportedError
   *
   * @param chain - The unsupported chain
   * @param supportedChains - List of supported chains (optional)
   */
  constructor(chain: string, supportedChains?: string[]) {
    const supportedList = supportedChains && supportedChains.length > 0
      ? `. Supported chains: ${supportedChains.join(', ')}`
      : '';
    super(`Chain ${chain} is not supported${supportedList}`);
    this.name = 'ChainNotSupportedError';
    this.chain = chain;
    this.supportedChains = supportedChains || [];
    Object.setPrototypeOf(this, ChainNotSupportedError.prototype);
  }
}

/**
 * Error thrown when operation requires connected wallet but wallet is not connected
 */
export class WalletNotConnectedError extends Error {
  /**
   * The chain that is not connected
   * @readonly
   */
  readonly chain: string;

  /**
   * Creates a new WalletNotConnectedError
   *
   * @param chain - The chain that requires connection
   */
  constructor(chain: string) {
    super(`Wallet is not connected to ${chain}`);
    this.name = 'WalletNotConnectedError';
    this.chain = chain;
    Object.setPrototypeOf(this, WalletNotConnectedError.prototype);
  }
}

/**
 * Error thrown when an account address is not found in the wallet
 */
export class AccountNotFoundError extends Error {
  /**
   * The account address that was not found
   * @readonly
   */
  readonly address: string;

  /**
   * List of available accounts
   * @readonly
   */
  readonly availableAccounts: readonly string[];

  /**
   * Creates a new AccountNotFoundError
   *
   * @param address - The account address that was not found
   * @param availableAccounts - List of available account addresses
   */
  constructor(address: string, availableAccounts: string[] = []) {
    const availableList = availableAccounts.length > 0
      ? `. Available accounts: ${availableAccounts.join(', ')}`
      : '';
    super(`Account not found: ${address}${availableList}`);
    this.name = 'AccountNotFoundError';
    this.address = address;
    this.availableAccounts = availableAccounts;
    Object.setPrototypeOf(this, AccountNotFoundError.prototype);
  }
}

/**
 * Error thrown when a required wallet browser extension is not found
 */
export class WalletExtensionNotFoundError extends Error {
  /**
   * The name of the missing extension
   * @readonly
   */
  readonly extensionName: string;

  /**
   * Creates a new WalletExtensionNotFoundError
   *
   * @param extensionName - The name of the missing extension (e.g., "MetaMask", "Phantom")
   */
  constructor(extensionName: string) {
    super(`${extensionName} wallet extension not found. Please install ${extensionName}.`);
    this.name = 'WalletExtensionNotFoundError';
    this.extensionName = extensionName;
    Object.setPrototypeOf(this, WalletExtensionNotFoundError.prototype);
  }
}

/**
 * Error thrown when an address has invalid format for the specified chain
 */
export class InvalidAddressFormatError extends Error {
  /**
   * The invalid address
   * @readonly
   */
  readonly address: string;

  /**
   * The chain the address was intended for
   * @readonly
   */
  readonly chain: string;

  /**
   * Creates a new InvalidAddressFormatError
   *
   * @param address - The invalid address
   * @param chain - The chain the address was intended for
   */
  constructor(address: string, chain: string) {
    super(`Invalid address format for ${chain}: ${address}`);
    this.name = 'InvalidAddressFormatError';
    this.address = address;
    this.chain = chain;
    Object.setPrototypeOf(this, InvalidAddressFormatError.prototype);
  }
}

/**
 * Error thrown when an account index is invalid
 */
export class InvalidAccountIndexError extends Error {
  /**
   * The invalid index value
   * @readonly
   */
  readonly index: number;

  /**
   * Creates a new InvalidAccountIndexError
   *
   * @param index - The invalid index value
   * @param reason - Additional explanation (optional)
   */
  constructor(index: number, reason?: string) {
    const reasonText = reason ? ` - ${reason}` : '';
    super(`Invalid account index: ${index}${reasonText}`);
    this.name = 'InvalidAccountIndexError';
    this.index = index;
    Object.setPrototypeOf(this, InvalidAccountIndexError.prototype);
  }
}

/**
 * Error thrown when attempting to switch to a chain that's already active
 */
export class ChainAlreadyActiveError extends Error {
  /**
   * The chain that is already active
   * @readonly
   */
  readonly chain: string;

  /**
   * Creates a new ChainAlreadyActiveError
   *
   * @param chain - The chain that is already active
   */
  constructor(chain: string) {
    super(`Chain ${chain} is already active`);
    this.name = 'ChainAlreadyActiveError';
    this.chain = chain;
    Object.setPrototypeOf(this, ChainAlreadyActiveError.prototype);
  }
}
