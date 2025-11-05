import { Chain } from '@cygnus-wealth/data-models';
import { InvalidAddressFormatError } from '../errors/WalletErrors';

/**
 * BlockchainAddress Type Utility
 *
 * Represents an immutable blockchain address with chain-specific validation and normalization.
 *
 * @remarks
 * This is a type utility for infrastructure layer - it provides validation and normalization
 * for blockchain addresses across different chains.
 *
 * @example
 * ```typescript
 * const ethAddress = BlockchainAddress.create(
 *   '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
 *   Chain.ETHEREUM
 * );
 *
 * console.log(ethAddress.value); // '0x742d35cc6634c0532925a3b844bc9e7595f0beb' (normalized)
 * console.log(ethAddress.display()); // '0x742d...f0beb'
 * ```
 */
export class BlockchainAddress {
  /**
   * Creates a new BlockchainAddress with validation
   *
   * @param address - Raw address string to validate and normalize
   * @param chain - The blockchain this address belongs to
   * @returns A new BlockchainAddress instance
   * @throws {InvalidAddressFormatError} If address format is invalid for the specified chain
   */
  static create(address: string, chain: Chain): BlockchainAddress {
    // Validate address format for the specific chain
    if (isEVMChain(chain)) {
      if (!isValidEVMAddress(address)) {
        throw new InvalidAddressFormatError(address, chain);
      }
      // Normalize EVM addresses to lowercase
      const normalized = address.toLowerCase();
      return new BlockchainAddress(normalized, chain);
    } else if (chain === Chain.SOLANA) {
      if (!isValidSolanaAddress(address)) {
        throw new InvalidAddressFormatError(address, chain);
      }
      // Preserve original case for Solana
      return new BlockchainAddress(address, chain);
    } else if (chain === Chain.SUI) {
      if (!isValidSUIAddress(address)) {
        throw new InvalidAddressFormatError(address, chain);
      }
      // Normalize SUI addresses to lowercase
      const normalized = address.toLowerCase();
      return new BlockchainAddress(normalized, chain);
    } else {
      throw new InvalidAddressFormatError(address, chain);
    }
  }

  /**
   * The normalized address value
   * @readonly
   */
  readonly value: string;

  /**
   * The blockchain this address belongs to
   * @readonly
   */
  readonly chain: Chain;

  /**
   * Private constructor - use BlockchainAddress.create() instead
   *
   * @param value - Normalized address value
   * @param chain - The blockchain
   */
  private constructor(value: string, chain: Chain) {
    this.value = value;
    this.chain = chain;
  }

  /**
   * Checks equality with another BlockchainAddress
   *
   * @param other - Another BlockchainAddress to compare with
   * @returns true if both have same chain and value, false otherwise
   */
  equals(other: BlockchainAddress | null | undefined): boolean {
    if (!other) return false;
    return this.chain === other.chain && this.value === other.value;
  }

  /**
   * Returns truncated address for display purposes
   *
   * @returns Formatted string like "0x742d...f0beb"
   */
  display(): string {
    if (this.value.length < 10) {
      return this.value;
    }
    const start = this.value.substring(0, 6);
    const end = this.value.substring(this.value.length - 4);
    return `${start}...${end}`;
  }

  /**
   * Returns full address string
   *
   * @returns The complete normalized address
   */
  toString(): string {
    return this.value;
  }
}

/**
 * Helper functions for address validation
 */

/**
 * Checks if a chain is an EVM-compatible chain
 *
 * @param chain - The chain to check
 * @returns true if chain is EVM-compatible
 */
function isEVMChain(chain: Chain): boolean {
  const evmChains = [
    Chain.ETHEREUM,
    Chain.POLYGON,
    Chain.ARBITRUM,
    Chain.OPTIMISM,
    Chain.BSC
  ];
  return evmChains.includes(chain);
}

/**
 * Validates Ethereum-compatible address format
 *
 * @param address - Address to validate
 * @returns true if valid EVM address format
 */
function isValidEVMAddress(address: string): boolean {
  // Check if starts with "0x", is exactly 42 characters, and remaining 40 chars are hex
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;
  const hexPart = address.substring(2);
  return /^[0-9a-fA-F]{40}$/.test(hexPart);
}

/**
 * Validates Solana address format (base58)
 *
 * @param address - Address to validate
 * @returns true if valid Solana address format
 */
function isValidSolanaAddress(address: string): boolean {
  // Check length is between 32-44 characters
  if (address.length < 32 || address.length > 44) return false;
  // Check all characters are valid base58: [1-9A-HJ-NP-Za-km-z]
  // Base58 excludes: 0, O, I, l
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Validates SUI address format
 *
 * @param address - Address to validate
 * @returns true if valid SUI address format
 */
function isValidSUIAddress(address: string): boolean {
  // Check if starts with "0x", is exactly 66 characters, and remaining 64 chars are hex
  if (!address.startsWith('0x')) return false;
  if (address.length !== 66) return false;
  const hexPart = address.substring(2);
  return /^[0-9a-fA-F]{64}$/.test(hexPart);
}
