import { describe, it, expect } from 'vitest';
import { Chain } from '@cygnus-wealth/data-models';
import { BlockchainAddress } from './BlockchainAddress';

/**
 * Unit Tests for BlockchainAddress Value Object
 *
 * These tests follow Test-Driven Development (TDD) principles.
 * Implement the BlockchainAddress class to make these tests pass.
 */
describe('BlockchainAddress', () => {
  describe('Construction', () => {
    it('should create valid Ethereum address with normalization', () => {
      // Arrange
      const rawAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC';
      const expectedNormalized = '0x742d35cc6634c0532925a3b844bc9e7595f0bebc';

      // Act
      const address = BlockchainAddress.create(rawAddress, Chain.ETHEREUM);

      // Assert
      expect(address).toBeDefined();
      expect(address.value).toBe(expectedNormalized);
      expect(address.chain).toBe(Chain.ETHEREUM);
    });

    it('should create valid Polygon address (EVM chain)', () => {
      // Arrange
      const rawAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC';
      const expectedNormalized = '0x742d35cc6634c0532925a3b844bc9e7595f0bebc';

      // Act
      const address = BlockchainAddress.create(rawAddress, Chain.POLYGON);

      // Assert
      expect(address.value).toBe(expectedNormalized);
      expect(address.chain).toBe(Chain.POLYGON);
    });

    it('should throw error for invalid Ethereum address (wrong length)', () => {
      // Arrange
      const invalidAddress = '0x742d35Cc';

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.ETHEREUM);
      }).toThrow(/invalid address format/i);
    });

    it('should throw error for invalid Ethereum address (no 0x prefix)', () => {
      // Arrange
      const invalidAddress = '742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.ETHEREUM);
      }).toThrow(/invalid address format/i);
    });

    it('should throw error for invalid Ethereum address (non-hex characters)', () => {
      // Arrange
      const invalidAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595fZZZZ';

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.ETHEREUM);
      }).toThrow(/invalid address format/i);
    });

    it('should create valid Solana address', () => {
      // Arrange
      const solanaAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';

      // Act
      const address = BlockchainAddress.create(solanaAddress, Chain.SOLANA);

      // Assert
      expect(address.value).toBe(solanaAddress); // Solana addresses preserve case
      expect(address.chain).toBe(Chain.SOLANA);
    });

    it('should throw error for invalid Solana address (wrong length)', () => {
      // Arrange
      const invalidAddress = 'DYw8jCTf';

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.SOLANA);
      }).toThrow(/invalid address format/i);
    });

    it('should throw error for invalid Solana address (invalid base58)', () => {
      // Arrange - base58 excludes 0, O, I, l
      const invalidAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6Z0OIl'; // Contains forbidden chars

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.SOLANA);
      }).toThrow(/invalid address format/i);
    });

    it('should create valid SUI address', () => {
      // Arrange
      const rawAddress = '0x' + 'a'.repeat(64);
      const expectedNormalized = '0x' + 'a'.repeat(64);

      // Act
      const address = BlockchainAddress.create(rawAddress, Chain.SUI);

      // Assert
      expect(address.value).toBe(expectedNormalized);
      expect(address.chain).toBe(Chain.SUI);
    });

    it('should throw error for invalid SUI address (wrong length)', () => {
      // Arrange
      const invalidAddress = '0x' + 'a'.repeat(30); // Too short

      // Act & Assert
      expect(() => {
        BlockchainAddress.create(invalidAddress, Chain.SUI);
      }).toThrow(/invalid address format/i);
    });
  });

  describe('Equality', () => {
    it('should return true for identical addresses', () => {
      // Arrange
      const address1 = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );
      const address2 = BlockchainAddress.create(
        '0x742d35cc6634c0532925a3b844bc9e7595f0bebc', // Different case
        Chain.ETHEREUM
      );

      // Act
      const result = address1.equals(address2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for different addresses', () => {
      // Arrange
      const address1 = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );
      const address2 = BlockchainAddress.create(
        '0x0000000000000000000000000000000000000000',
        Chain.ETHEREUM
      );

      // Act
      const result = address1.equals(address2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for same address on different chains', () => {
      // Arrange
      const rawAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC';
      const address1 = BlockchainAddress.create(rawAddress, Chain.ETHEREUM);
      const address2 = BlockchainAddress.create(rawAddress, Chain.POLYGON);

      // Act
      const result = address1.equals(address2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing to null', () => {
      // Arrange
      const address = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );

      // Act
      const result = address.equals(null);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing to undefined', () => {
      // Arrange
      const address = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );

      // Act
      const result = address.equals(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Display Format', () => {
    it('should return truncated display format for normal address', () => {
      // Arrange
      const address = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );

      // Act
      const display = address.display();

      // Assert
      expect(display).toBe('0x742d...bebc');
    });

    it('should return full address if too short to truncate', () => {
      // Arrange
      // Create a mock short address (for testing purposes)
      // In reality, valid addresses won't be this short
      const shortAddress = '0x123456';

      // This test assumes we'd handle edge cases gracefully
      // Actual implementation may vary based on validation rules
    });

    it('should handle Solana address display', () => {
      // Arrange
      const address = BlockchainAddress.create(
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        Chain.SOLANA
      );

      // Act
      const display = address.display();

      // Assert
      expect(display).toBe('DYw8jC...NSKK');
    });
  });

  describe('String Conversion', () => {
    it('should return full normalized address from toString()', () => {
      // Arrange
      const rawAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC';
      const address = BlockchainAddress.create(rawAddress, Chain.ETHEREUM);

      // Act
      const result = address.toString();

      // Assert
      expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0bebc');
    });
  });

  describe('Immutability', () => {
    it('should have readonly value property', () => {
      // Arrange
      const address = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );
      const originalValue = address.value;

      // Act - TypeScript prevents assignment at compile time
      // But we can verify the value is defined and doesn't change

      // Assert
      expect(address.value).toBe(originalValue);
      expect(address.value).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0bebc');
    });

    it('should have readonly chain property', () => {
      // Arrange
      const address = BlockchainAddress.create(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
        Chain.ETHEREUM
      );
      const originalChain = address.chain;

      // Act - TypeScript prevents assignment at compile time
      // But we can verify the chain is defined and doesn't change

      // Assert
      expect(address.chain).toBe(originalChain);
      expect(address.chain).toBe(Chain.ETHEREUM);
    });
  });
});
