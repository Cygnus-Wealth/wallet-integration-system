# Implementation Guide for Unit Architecture

## Overview

This guide helps developers implement the unit architecture defined in `UNIT_ARCHITECTURE.md` using Test-Driven Development (TDD).

## Quick Start

### 1. Review Architecture Document
Read `UNIT_ARCHITECTURE.md` to understand:
- System role (infrastructure/adapter layer)
- Four focused improvements
- Testing strategy
- File organization

### 2. Choose a Component to Implement
Start with low-risk components:
1. **Error Types** (easiest, no dependencies)
   - All error classes in `WalletErrors.stub.ts`

2. **Type Utilities** (easy, minimal dependencies)
   - `BlockchainAddress`

3. **Factory Service** (medium complexity)
   - `WalletIntegrationFactory`

4. **Base Class** (higher complexity)
   - `BaseWalletIntegration`

### 3. Follow TDD Red-Green-Refactor Cycle

```bash
# For each component:

# 1. RED - Run tests (they should fail)
npm test src/errors/WalletErrors.test.ts

# 2. GREEN - Implement minimal code to pass
# Edit: src/errors/WalletErrors.stub.ts
# Remove stub implementation, add real code

# 3. Run tests again (they should pass)
npm test src/errors/WalletErrors.test.ts

# 4. REFACTOR - Improve code quality
# Ensure TypeScript strict checks pass
npm run typecheck

# 5. Run all tests to ensure nothing broke
npm test
```

## Implementation Order (Recommended)

### Phase 1: Error Types (Low Risk)

#### Step 1.1: All Wallet Errors
**File**: `src/errors/WalletErrors.stub.ts`
**Test**: `src/errors/WalletErrors.test.ts`

**Implementation Tips**:
- Each error extends `Error`
- Set `this.name = 'ErrorClassName'`
- Use `Object.setPrototypeOf(this, ClassName.prototype)` for instanceof
- Build descriptive messages with context
- Make properties readonly

**Contract Checklist for Each Error**:
- [ ] Extends Error
- [ ] Has correct name property
- [ ] instanceof checks work correctly
- [ ] Message includes relevant context
- [ ] Properties are readonly
- [ ] Stack trace is preserved

### Phase 2: Type Utilities (Low Risk)

#### Step 2.1: BlockchainAddress Type Utility
**File**: `src/types/BlockchainAddress.stub.ts`
**Test**: `src/types/BlockchainAddress.test.ts`

**Implementation Tips**:
- Start with `isValidEVMAddress()` helper function
- Use regex for address validation: `/^0x[0-9a-fA-F]{40}$/`
- Implement `create()` static factory method
- Use private constructor pattern
- Make properties `readonly`

**Contract Checklist**:
- [ ] Validates EVM addresses (42 chars, 0x prefix, hex)
- [ ] Validates Solana addresses (32-44 chars, base58)
- [ ] Validates SUI addresses (66 chars, 0x prefix, hex)
- [ ] Normalizes EVM/SUI to lowercase
- [ ] Preserves Solana case
- [ ] Implements equals() with case-insensitive comparison
- [ ] Implements display() with truncation
- [ ] Properties are readonly (immutable)

### Phase 3: Factory Service (Medium Risk)

#### Step 3.1: WalletIntegrationFactory
**File**: `src/services/WalletIntegrationFactory.stub.ts`
**Test**: Create test file following the pattern

**Implementation Tips**:
- Import `EVM_CHAINS` from `utils/constants.ts`
- Use `EVM_CHAINS.includes(chain)` for EVM detection
- Import existing integration classes
- Throw `ChainNotSupportedError` for unknown chains

**Contract Checklist**:
- [ ] Creates EVMWalletIntegration for EVM chains
- [ ] Creates SolanaWalletIntegration for SOLANA
- [ ] Creates SuiWalletIntegration for SUI
- [ ] Throws ChainNotSupportedError for unsupported
- [ ] Passes config to integration constructors
- [ ] isChainSupported() works correctly
- [ ] getSupportedChains() returns all supported

### Phase 4: Base Integration (Higher Risk)

#### Step 4.1: BaseWalletIntegration
**File**: `src/chains/BaseWalletIntegration.stub.ts`
**Test**: `src/chains/BaseWalletIntegration.test.ts`

**Implementation Tips**:
- Mark class as `abstract`
- Mark `connectToProvider()`, `disconnectFromProvider()`, `getAccountsFromProvider()` as abstract
- Store state in protected properties
- Cache last connection to avoid redundant calls
- Use `findAccountIndex()` helper for case-insensitive search

**Contract Checklist**:
- [ ] connect() calls connectToProvider() once
- [ ] connect() caches connection
- [ ] disconnect() calls disconnectFromProvider() when connected
- [ ] disconnect() clears state
- [ ] getAddress() throws when not connected
- [ ] getAllAccounts() fetches fresh accounts
- [ ] switchAccount() validates address exists
- [ ] switchAccount() is case-insensitive
- [ ] getActiveAccount() returns null when disconnected
- [ ] isConnected() reflects state correctly

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/errors/WalletErrors.test.ts

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test -- --coverage
```

### Type Checking

```bash
# Check TypeScript types
npm run typecheck

# Run TypeScript compiler in watch mode
npm run dev
```

### Linting

```bash
# Run ESLint
npm run lint
```

## Common Patterns

### Type Utility Pattern

```typescript
export class MyTypeUtility {
  static create(value: string): MyTypeUtility {
    // Validation
    if (!isValid(value)) {
      throw new Error('Invalid value');
    }

    // Normalization
    const normalized = normalize(value);

    // Construction
    return new MyTypeUtility(normalized);
  }

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  equals(other: MyTypeUtility | null | undefined): boolean {
    if (!other) return false;
    return this.value === other.value;
  }
}
```

### Error Class Pattern

```typescript
export class MyCustomError extends Error {
  readonly context: string;

  constructor(context: string, additionalInfo?: string) {
    const message = `Error occurred: ${context}`;
    super(additionalInfo ? `${message} - ${additionalInfo}` : message);

    this.name = 'MyCustomError';
    this.context = context;

    // Fix prototype chain for instanceof
    Object.setPrototypeOf(this, MyCustomError.prototype);
  }
}
```

### Immutable Array Operations

```typescript
// DO: Create new arrays
const newArray = [...oldArray, newItem];

// DO: Map to new objects
const updated = accounts.map((acc, index) => ({
  ...acc,
  index
}));

// DON'T: Mutate directly
// oldArray.push(newItem); // BAD
// accounts[0].index = 5;  // BAD
```

## Testing Patterns

### Basic Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = 'test-value';

      // Act: Call the method under test
      const result = component.methodName(input);

      // Assert: Verify expectations
      expect(result).toBe('expected-value');
    });
  });
});
```

### Testing Errors

```typescript
it('should throw specific error', () => {
  expect(() => {
    component.dangerousMethod();
  }).toThrow(MyCustomError);
});

// Or with async
await expect(
  component.asyncDangerousMethod()
).rejects.toThrow(MyCustomError);
```

### Testing Immutability

```typescript
it('should not mutate input', () => {
  // Arrange
  const input = [1, 2, 3];
  const inputCopy = [...input];

  // Act
  component.processArray(input);

  // Assert
  expect(input).toEqual(inputCopy);
});
```

### Mocking with Vitest

```typescript
import { vi } from 'vitest';

// Create mock function
const mockFn = vi.fn();
mockFn.mockReturnValue('mock-value');
mockFn.mockResolvedValue('async-value');

// Verify calls
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('expected-arg');
```

## Quality Standards

Before considering a component complete:

- [ ] All tests pass
- [ ] Code coverage > target (see UNIT_ARCHITECTURE.md)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] JSDoc comments on all public methods
- [ ] Code is immutable where appropriate
- [ ] Error handling is comprehensive

## Troubleshooting

### Tests Won't Run
```bash
# Clear caches
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
# Check for missing imports
# Verify stub files have been renamed (remove .stub.ts)
# Ensure types are exported from index files
```

### Test Failures
- Read the JSDoc `@contractTest` comments in stub files
- Verify each contract point is implemented
- Check test assertions match expected behavior
- Use `console.log()` for debugging (remove before commit)

## Getting Help

1. Review `UNIT_ARCHITECTURE.md` for architectural guidance
2. Check JSDoc comments in stub files for detailed contracts
3. Examine test files for expected behavior examples
4. Review existing implementations (EVMWalletIntegration, etc.)

## Next Steps After Implementation

Once you've implemented the stubs:

1. **Integration Testing**: Test components together
2. **Refactor Existing Code**: Update existing implementations to use new components
3. **Documentation**: Update README with new patterns
4. **Examples**: Create usage examples in `examples/` directory

## Remember

- **Test First**: Always run tests before implementing
- **Small Steps**: Implement one method at a time
- **Green Fast**: Get tests passing quickly, refactor later
- **Commit Often**: Commit after each passing test suite
- **Read Contracts**: JSDoc comments are your specification

Happy coding! 🚀
