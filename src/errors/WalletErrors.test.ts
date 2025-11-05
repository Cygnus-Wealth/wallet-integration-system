import { describe, it, expect } from 'vitest';
import {
  WalletNotFoundError,
  ChainNotSupportedError,
  WalletNotConnectedError,
  AccountNotFoundError,
  WalletExtensionNotFoundError,
  InvalidAddressFormatError,
  InvalidAccountIndexError,
  ChainAlreadyActiveError
} from './WalletErrors';

/**
 * Unit Tests for Wallet Error Types
 *
 * These tests verify proper error construction and inheritance.
 */
describe('Wallet Errors', () => {
  describe('WalletNotFoundError', () => {
    it('should create error with wallet ID in message', () => {
      // Arrange
      const walletId = 'abc-123-def';

      // Act
      const error = new WalletNotFoundError(walletId);

      // Assert
      expect(error.message).toContain('abc-123-def');
      expect(error.walletId).toBe(walletId);
    });

    it('should be instance of Error', () => {
      // Act
      const error = new WalletNotFoundError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of WalletNotFoundError', () => {
      // Act
      const error = new WalletNotFoundError('test');

      // Assert
      expect(error).toBeInstanceOf(WalletNotFoundError);
    });

    it('should have correct name property', () => {
      // Act
      const error = new WalletNotFoundError('test');

      // Assert
      expect(error.name).toBe('WalletNotFoundError');
    });
  });

  describe('ChainNotSupportedError', () => {
    it('should create error with chain in message', () => {
      // Arrange
      const chain = 'AVALANCHE';

      // Act
      const error = new ChainNotSupportedError(chain);

      // Assert
      expect(error.message).toContain('AVALANCHE');
      expect(error.chain).toBe(chain);
    });

    it('should include supported chains in message', () => {
      // Arrange
      const chain = 'AVALANCHE';
      const supportedChains = ['ETHEREUM', 'POLYGON', 'SOLANA'];

      // Act
      const error = new ChainNotSupportedError(chain, supportedChains);

      // Assert
      expect(error.message).toContain('ETHEREUM');
      expect(error.message).toContain('POLYGON');
      expect(error.message).toContain('SOLANA');
      expect(error.supportedChains).toEqual(supportedChains);
    });

    it('should work without supported chains list', () => {
      // Act
      const error = new ChainNotSupportedError('TEST_CHAIN');

      // Assert
      expect(error.message).toContain('TEST_CHAIN');
      expect(error.chain).toBe('TEST_CHAIN');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new ChainNotSupportedError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('WalletNotConnectedError', () => {
    it('should create error with chain in message', () => {
      // Arrange
      const chain = 'ETHEREUM';

      // Act
      const error = new WalletNotConnectedError(chain);

      // Assert
      expect(error.message).toContain('ETHEREUM');
      expect(error.chain).toBe(chain);
    });

    it('should indicate wallet is not connected', () => {
      // Act
      const error = new WalletNotConnectedError('ETHEREUM');

      // Assert
      expect(error.message.toLowerCase()).toContain('not connected');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new WalletNotConnectedError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('AccountNotFoundError', () => {
    it('should create error with address in message', () => {
      // Arrange
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Act
      const error = new AccountNotFoundError(address);

      // Assert
      expect(error.message).toContain(address);
      expect(error.address).toBe(address);
    });

    it('should include available accounts in message', () => {
      // Arrange
      const address = '0x123';
      const availableAccounts = ['0xaaa', '0xbbb', '0xccc'];

      // Act
      const error = new AccountNotFoundError(address, availableAccounts);

      // Assert
      expect(error.message).toContain('0xaaa');
      expect(error.message).toContain('0xbbb');
      expect(error.message).toContain('0xccc');
      expect(error.availableAccounts).toEqual(availableAccounts);
    });

    it('should work without available accounts list', () => {
      // Act
      const error = new AccountNotFoundError('0x123');

      // Assert
      expect(error.message).toContain('0x123');
      expect(error.availableAccounts).toEqual([]);
    });

    it('should be instance of Error', () => {
      // Act
      const error = new AccountNotFoundError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('WalletExtensionNotFoundError', () => {
    it('should create error with extension name', () => {
      // Arrange
      const extensionName = 'MetaMask';

      // Act
      const error = new WalletExtensionNotFoundError(extensionName);

      // Assert
      expect(error.message).toContain('MetaMask');
      expect(error.extensionName).toBe(extensionName);
    });

    it('should suggest installation', () => {
      // Act
      const error = new WalletExtensionNotFoundError('MetaMask');

      // Assert
      expect(error.message.toLowerCase()).toContain('install');
    });

    it('should work with different wallet names', () => {
      // Act
      const error1 = new WalletExtensionNotFoundError('Phantom');
      const error2 = new WalletExtensionNotFoundError('Suiet');

      // Assert
      expect(error1.message).toContain('Phantom');
      expect(error2.message).toContain('Suiet');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new WalletExtensionNotFoundError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('InvalidAddressFormatError', () => {
    it('should create error with address and chain', () => {
      // Arrange
      const address = 'invalid-address';
      const chain = 'ETHEREUM';

      // Act
      const error = new InvalidAddressFormatError(address, chain);

      // Assert
      expect(error.message).toContain('invalid-address');
      expect(error.message).toContain('ETHEREUM');
      expect(error.address).toBe(address);
      expect(error.chain).toBe(chain);
    });

    it('should indicate invalid format', () => {
      // Act
      const error = new InvalidAddressFormatError('test', 'ETHEREUM');

      // Assert
      expect(error.message.toLowerCase()).toContain('invalid');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new InvalidAddressFormatError('test', 'ETHEREUM');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('InvalidAccountIndexError', () => {
    it('should create error with index', () => {
      // Arrange
      const index = -1;

      // Act
      const error = new InvalidAccountIndexError(index);

      // Assert
      expect(error.message).toContain('-1');
      expect(error.index).toBe(index);
    });

    it('should include reason if provided', () => {
      // Arrange
      const index = -1;
      const reason = 'Index must be non-negative';

      // Act
      const error = new InvalidAccountIndexError(index, reason);

      // Assert
      expect(error.message).toContain(reason);
    });

    it('should work without reason', () => {
      // Act
      const error = new InvalidAccountIndexError(-1);

      // Assert
      expect(error.message).toContain('-1');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new InvalidAccountIndexError(-1);

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ChainAlreadyActiveError', () => {
    it('should create error with chain name', () => {
      // Arrange
      const chain = 'ETHEREUM';

      // Act
      const error = new ChainAlreadyActiveError(chain);

      // Assert
      expect(error.message).toContain('ETHEREUM');
      expect(error.chain).toBe(chain);
    });

    it('should indicate chain is already active', () => {
      // Act
      const error = new ChainAlreadyActiveError('ETHEREUM');

      // Assert
      expect(error.message.toLowerCase()).toContain('already');
    });

    it('should be instance of Error', () => {
      // Act
      const error = new ChainAlreadyActiveError('test');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper prototype chain for all errors', () => {
      // Arrange & Act
      const errors = [
        new WalletNotFoundError('test'),
        new ChainNotSupportedError('test'),
        new WalletNotConnectedError('test'),
        new AccountNotFoundError('test'),
        new WalletExtensionNotFoundError('test'),
        new InvalidAddressFormatError('test', 'test'),
        new InvalidAccountIndexError(0),
        new ChainAlreadyActiveError('test')
      ];

      // Assert
      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).toBeDefined();
      });
    });

    it('should be catchable as Error type', () => {
      // Arrange
      const throwError = () => {
        throw new WalletNotFoundError('test');
      };

      // Act & Assert
      try {
        throwError();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(WalletNotFoundError);
      }
    });
  });
});
