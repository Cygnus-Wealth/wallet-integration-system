import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { WalletIntegration, WalletIntegrationConfig } from '../types';
import { EVMWalletIntegration } from '../chains/evm/EVMWalletIntegration';
import { SolanaWalletIntegration } from '../chains/solana/SolanaWalletIntegration';
import { SuiWalletIntegration } from '../chains/sui/SuiWalletIntegration';
import { ChainNotSupportedError } from '../errors/WalletErrors';
import { EVM_CHAINS } from '../utils/constants';

/**
 * WalletIntegrationFactory Service
 *
 * Creates chain-specific wallet integration instances based on chain type and configuration.
 *
 * @remarks
 * This is an infrastructure service that encapsulates the logic for determining which
 * integration class to instantiate based on the chain type.
 *
 * @example
 * ```typescript
 * const factory = new WalletIntegrationFactory();
 *
 * const ethIntegration = factory.create(
 *   Chain.ETHEREUM,
 *   IntegrationSource.METAMASK
 * );
 *
 * const solanaIntegration = factory.create(
 *   Chain.SOLANA,
 *   IntegrationSource.PHANTOM,
 *   { rpcUrl: 'https://api.mainnet-beta.solana.com' }
 * );
 * ```
 *
 * @contractTest Create EVM Integration
 * GIVEN Chain.ETHEREUM and IntegrationSource.METAMASK
 * WHEN create() is called
 * THEN should return EVMWalletIntegration instance
 * AND instance should have correct chain and source properties
 *
 * @contractTest Create EVM Integration - Multiple Chains
 * GIVEN any EVM chain (ETHEREUM, POLYGON, ARBITRUM, etc.)
 * WHEN create() is called
 * THEN should return EVMWalletIntegration instance for that chain
 *
 * @contractTest Create Solana Integration
 * GIVEN Chain.SOLANA and IntegrationSource.PHANTOM
 * WHEN create() is called
 * THEN should return SolanaWalletIntegration instance
 *
 * @contractTest Create SUI Integration
 * GIVEN Chain.SUI and IntegrationSource.SUIET
 * WHEN create() is called
 * THEN should return SuiWalletIntegration instance
 *
 * @contractTest Unsupported Chain
 * GIVEN an unsupported chain (not in EVM_CHAINS, not SOLANA, not SUI)
 * WHEN create() is called
 * THEN should throw ChainNotSupportedError with list of supported chains
 *
 * @contractTest Configuration Passing
 * GIVEN Chain.SOLANA and custom config { rpcUrl: 'custom-url' }
 * WHEN create() is called
 * THEN should pass config to SolanaWalletIntegration constructor
 *
 * @contractTest Is Chain Supported - EVM
 * GIVEN Chain.ETHEREUM
 * WHEN isChainSupported() is called
 * THEN should return true
 *
 * @contractTest Is Chain Supported - Non-EVM
 * GIVEN Chain.SOLANA
 * WHEN isChainSupported() is called
 * THEN should return true
 *
 * @contractTest Is Chain Supported - Unsupported
 * GIVEN an unsupported chain
 * WHEN isChainSupported() is called
 * THEN should return false
 *
 * @contractTest Get Supported Chains
 * WHEN getSupportedChains() is called
 * THEN should return array containing all EVM chains, SOLANA, and SUI
 */
export class WalletIntegrationFactory {
  /**
   * Creates a wallet integration instance for the specified chain
   *
   * @param chain - The blockchain to create integration for
   * @param source - The wallet extension source
   * @param config - Optional configuration for the integration
   * @returns A new WalletIntegration instance
   * @throws {ChainNotSupportedError} If chain is not supported
   *
   * @implementation
   * 1. Check if chain is in EVM_CHAINS array
   *    - If yes, return new EVMWalletIntegration(chain, source, config)
   * 2. Check if chain is Chain.SOLANA
   *    - If yes, return new SolanaWalletIntegration(chain, source, config)
   * 3. Check if chain is Chain.SUI
   *    - If yes, return new SuiWalletIntegration(chain, source, config)
   * 4. If none match, throw ChainNotSupportedError with getSupportedChains()
   */
  create(
    chain: Chain,
    source: IntegrationSource,
    config?: WalletIntegrationConfig
  ): WalletIntegration {
    // Check if chain is in EVM_CHAINS array
    if (EVM_CHAINS.includes(chain)) {
      return new EVMWalletIntegration(chain, source, config);
    }

    // Check if chain is Chain.SOLANA
    if (chain === Chain.SOLANA) {
      return new SolanaWalletIntegration(chain, source, config);
    }

    // Check if chain is Chain.SUI
    if (chain === Chain.SUI) {
      return new SuiWalletIntegration(chain, source, config);
    }

    // If none match, throw ChainNotSupportedError with getSupportedChains()
    throw new ChainNotSupportedError(chain, this.getSupportedChains());
  }

  /**
   * Checks if a chain is supported by this factory
   *
   * @param chain - The chain to check
   * @returns true if chain is supported, false otherwise
   *
   * @implementation
   * 1. Check if chain is in EVM_CHAINS array, return true
   * 2. Check if chain is Chain.SOLANA, return true
   * 3. Check if chain is Chain.SUI, return true
   * 4. Otherwise return false
   */
  isChainSupported(chain: Chain): boolean {
    // Check if chain is in EVM_CHAINS array, return true
    if (EVM_CHAINS.includes(chain)) {
      return true;
    }

    // Check if chain is Chain.SOLANA, return true
    if (chain === Chain.SOLANA) {
      return true;
    }

    // Check if chain is Chain.SUI, return true
    if (chain === Chain.SUI) {
      return true;
    }

    // Otherwise return false
    return false;
  }

  /**
   * Gets list of all supported chains
   *
   * @returns Array of supported Chain values
   *
   * @implementation
   * Return array combining EVM_CHAINS + [Chain.SOLANA, Chain.SUI]
   */
  getSupportedChains(): Chain[] {
    // Return array combining EVM_CHAINS + [Chain.SOLANA, Chain.SUI]
    return [...EVM_CHAINS, Chain.SOLANA, Chain.SUI];
  }

  /**
   * Determines if a chain is an EVM chain
   *
   * @param chain - The chain to check
   * @returns true if chain is EVM-compatible, false otherwise
   *
   * @implementation
   * Return EVM_CHAINS.includes(chain)
   */
  isEVMChain(chain: Chain): boolean {
    // Return EVM_CHAINS.includes(chain)
    return EVM_CHAINS.includes(chain);
  }
}
