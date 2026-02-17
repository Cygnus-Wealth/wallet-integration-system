import { describe, it, expect } from 'vitest';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';
import { WalletIntegrationFactory } from './WalletIntegrationFactory';
import { EVMWalletIntegration } from '../chains/evm/EVMWalletIntegration';
import { CryptoComWalletIntegration } from '../chains/evm/CryptoComWalletIntegration';
import { TrustWalletIntegration, TRUST_WALLET_SOURCE } from '../chains/evm/TrustWalletIntegration';
import { SolanaWalletIntegration } from '../chains/solana/SolanaWalletIntegration';
import { SuiWalletIntegration } from '../chains/sui/SuiWalletIntegration';
import { ChainNotSupportedError } from '../errors/WalletErrors';

/**
 * Unit Tests for WalletIntegrationFactory Service
 *
 * These tests follow Test-Driven Development (TDD) principles.
 * Implement the WalletIntegrationFactory class to make these tests pass.
 */
describe('WalletIntegrationFactory', () => {
  describe('create', () => {
    it('should create EVMWalletIntegration for Ethereum', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.ETHEREUM, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(IntegrationSource.METAMASK);
    });

    it('should create EVMWalletIntegration for Polygon', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.POLYGON, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.POLYGON);
    });

    it('should create EVMWalletIntegration for Arbitrum', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.ARBITRUM, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.ARBITRUM);
    });

    it('should create EVMWalletIntegration for Optimism', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.OPTIMISM, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.OPTIMISM);
    });

    it('should create EVMWalletIntegration for BSC', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.BSC, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.BSC);
    });

    it('should create EVMWalletIntegration for Avalanche', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.AVALANCHE, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.AVALANCHE);
    });

    it('should create EVMWalletIntegration for Base', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.BASE, IntegrationSource.METAMASK);

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      expect(integration.chain).toBe(Chain.BASE);
    });

    it('should create TrustWalletIntegration for Ethereum with Trust Wallet source', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.ETHEREUM, TRUST_WALLET_SOURCE);

      // Assert
      expect(integration).toBeInstanceOf(TrustWalletIntegration);
      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(TRUST_WALLET_SOURCE);
    });

    it('should create TrustWalletIntegration for BSC with Trust Wallet source', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.BSC, TRUST_WALLET_SOURCE);

      // Assert
      expect(integration).toBeInstanceOf(TrustWalletIntegration);
      expect(integration.chain).toBe(Chain.BSC);
    });

    it('should create TrustWalletIntegration for any EVM chain with Trust Wallet source', () => {
      const factory = new WalletIntegrationFactory();
      const evmChains = [
        Chain.ETHEREUM,
        Chain.POLYGON,
        Chain.ARBITRUM,
        Chain.OPTIMISM,
        Chain.BSC,
        Chain.AVALANCHE,
        Chain.BASE
      ];

      evmChains.forEach(chain => {
        const integration = factory.create(chain, TRUST_WALLET_SOURCE);
        expect(integration).toBeInstanceOf(TrustWalletIntegration);
        expect(integration.chain).toBe(chain);
      });
    });

    it('should create SolanaWalletIntegration for Solana', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.SOLANA, IntegrationSource.PHANTOM);

      // Assert
      expect(integration).toBeInstanceOf(SolanaWalletIntegration);
      expect(integration.chain).toBe(Chain.SOLANA);
      expect(integration.source).toBe(IntegrationSource.PHANTOM);
    });

    it('should create SuiWalletIntegration for SUI', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.create(Chain.SUI, IntegrationSource.SUIET);

      // Assert
      expect(integration).toBeInstanceOf(SuiWalletIntegration);
      expect(integration.chain).toBe(Chain.SUI);
      expect(integration.source).toBe(IntegrationSource.SUIET);
    });

    it('should throw ChainNotSupportedError for unsupported chain', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      // Use a chain value that doesn't exist (casting to bypass TS)
      const unsupportedChain = 'UNSUPPORTED_CHAIN' as any;

      // Act & Assert
      expect(() => {
        factory.create(unsupportedChain, IntegrationSource.METAMASK);
      }).toThrow(ChainNotSupportedError);
    });

    it('should include supported chains in error message', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const unsupportedChain = 'UNSUPPORTED_CHAIN' as any;

      // Act & Assert
      try {
        factory.create(unsupportedChain, IntegrationSource.METAMASK);
        expect.fail('Should have thrown ChainNotSupportedError');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainNotSupportedError);
        if (error instanceof ChainNotSupportedError) {
          expect(error.supportedChains.length).toBeGreaterThan(0);
          expect(error.supportedChains).toContain(Chain.ETHEREUM);
          expect(error.supportedChains).toContain(Chain.SOLANA);
          expect(error.supportedChains).toContain(Chain.SUI);
        }
      }
    });

    it('should pass configuration to EVM integration', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const config = { rpcUrl: 'https://custom-rpc.example.com' };

      // Act
      const integration = factory.create(
        Chain.ETHEREUM,
        IntegrationSource.METAMASK,
        config
      );

      // Assert
      expect(integration).toBeInstanceOf(EVMWalletIntegration);
      // Config is passed to constructor but not exposed as public property
      // We can't directly test it, but we can verify it doesn't throw
    });

    it('should pass configuration to Solana integration', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const config = { rpcUrl: 'https://api.mainnet-beta.solana.com' };

      // Act
      const integration = factory.create(
        Chain.SOLANA,
        IntegrationSource.PHANTOM,
        config
      );

      // Assert
      expect(integration).toBeInstanceOf(SolanaWalletIntegration);
    });

    it('should pass configuration to SUI integration', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const config = { rpcUrl: 'https://fullnode.mainnet.sui.io' };

      // Act
      const integration = factory.create(
        Chain.SUI,
        IntegrationSource.SUIET,
        config
      );

      // Assert
      expect(integration).toBeInstanceOf(SuiWalletIntegration);
    });
  });

  describe('isChainSupported', () => {
    it('should return true for Ethereum', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isChainSupported(Chain.ETHEREUM);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for all EVM chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const evmChains = [
        Chain.ETHEREUM,
        Chain.POLYGON,
        Chain.ARBITRUM,
        Chain.OPTIMISM,
        Chain.BSC,
        Chain.AVALANCHE,
        Chain.BASE
      ];

      // Act & Assert
      evmChains.forEach(chain => {
        expect(factory.isChainSupported(chain)).toBe(true);
      });
    });

    it('should return true for Solana', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isChainSupported(Chain.SOLANA);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for SUI', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isChainSupported(Chain.SUI);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for unsupported chain', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const unsupportedChain = 'UNSUPPORTED_CHAIN' as any;

      // Act
      const result = factory.isChainSupported(unsupportedChain);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getSupportedChains', () => {
    it('should return array of all supported chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const chains = factory.getSupportedChains();

      // Assert
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should include all EVM chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const evmChains = [
        Chain.ETHEREUM,
        Chain.POLYGON,
        Chain.ARBITRUM,
        Chain.OPTIMISM,
        Chain.BSC,
        Chain.AVALANCHE,
        Chain.BASE
      ];

      // Act
      const chains = factory.getSupportedChains();

      // Assert
      evmChains.forEach(chain => {
        expect(chains).toContain(chain);
      });
    });

    it('should include Solana', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const chains = factory.getSupportedChains();

      // Assert
      expect(chains).toContain(Chain.SOLANA);
    });

    it('should include SUI', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const chains = factory.getSupportedChains();

      // Assert
      expect(chains).toContain(Chain.SUI);
    });

    it('should return exactly 9 chains (7 EVM + Solana + SUI)', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const chains = factory.getSupportedChains();

      // Assert
      expect(chains.length).toBe(9);
    });
  });

  describe('isEVMChain', () => {
    it('should return true for Ethereum', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isEVMChain(Chain.ETHEREUM);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for all EVM chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const evmChains = [
        Chain.ETHEREUM,
        Chain.POLYGON,
        Chain.ARBITRUM,
        Chain.OPTIMISM,
        Chain.BSC,
        Chain.AVALANCHE,
        Chain.BASE
      ];

      // Act & Assert
      evmChains.forEach(chain => {
        expect(factory.isEVMChain(chain)).toBe(true);
      });
    });

    it('should return false for Solana', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isEVMChain(Chain.SOLANA);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for SUI', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const result = factory.isEVMChain(Chain.SUI);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for unsupported chain', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const unsupportedChain = 'UNSUPPORTED_CHAIN' as any;

      // Act
      const result = factory.isEVMChain(unsupportedChain);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createCryptoCom', () => {
    it('should create CryptoComWalletIntegration for Ethereum', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act
      const integration = factory.createCryptoCom(Chain.ETHEREUM);

      // Assert
      expect(integration).toBeInstanceOf(CryptoComWalletIntegration);
      expect(integration.chain).toBe(Chain.ETHEREUM);
      expect(integration.source).toBe(IntegrationSource.OTHER);
    });

    it('should create CryptoComWalletIntegration for all EVM chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const evmChains = [
        Chain.ETHEREUM,
        Chain.POLYGON,
        Chain.ARBITRUM,
        Chain.OPTIMISM,
        Chain.BSC,
        Chain.AVALANCHE,
        Chain.BASE
      ];

      // Act & Assert
      evmChains.forEach(chain => {
        const integration = factory.createCryptoCom(chain);
        expect(integration).toBeInstanceOf(CryptoComWalletIntegration);
        expect(integration.chain).toBe(chain);
      });
    });

    it('should throw for non-EVM chains', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();

      // Act & Assert
      expect(() => {
        factory.createCryptoCom(Chain.SOLANA);
      }).toThrow();
    });

    it('should pass configuration to integration', () => {
      // Arrange
      const factory = new WalletIntegrationFactory();
      const config = { rpcUrl: 'https://custom-rpc.example.com' };

      // Act
      const integration = factory.createCryptoCom(Chain.ETHEREUM, config);

      // Assert
      expect(integration).toBeInstanceOf(CryptoComWalletIntegration);
    });
  });
});
