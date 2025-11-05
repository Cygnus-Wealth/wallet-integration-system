# Unit Architecture: Wallet Integration System

## Document Purpose
This document defines the unit-level architecture for the Wallet Integration System. It provides detailed contracts, interfaces, and test specifications that developers can follow using Test-Driven Development (TDD) practices.

**For implementation guidance**, see [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) which provides:
- Step-by-step TDD workflow
- Recommended implementation order
- Code patterns and examples
- Testing strategies
- Troubleshooting tips

## Architectural Context

### System Role
The wallet-integration-system is an **infrastructure/adapter layer** that:
- Connects to external wallet providers (MetaMask, Phantom, Suiet)
- Translates provider APIs to common interfaces
- Manages connection state and multi-account coordination
- Provides a unified interface for wallet operations

**This is NOT a domain layer**. True domain logic resides in other bounded contexts (e.g., Portfolio Aggregation).

### Bounded Context Responsibilities
From [ARCHITECTURE.md](./ARCHITECTURE.md):

**In Scope**:
1. Wallet Connection Management
2. Multi-Account Support
3. Multi-Wallet Coordination
4. Address Discovery
5. Connection State Management

**Out of Scope**: Balance fetching, transaction history, transaction signing, private key handling, portfolio calculation

## Architectural Principles

### 1. Infrastructure Layer Design
- **Provider Abstraction**: Hide wallet-specific APIs behind common interfaces
- **Adapter Pattern**: Each blockchain has adapter for its wallet providers
- **Facade Pattern**: WalletManager provides unified interface to consumers
- **Anti-Corruption Layer**: Protect internal code from external provider changes

### 2. Browser-First Design
- All implementations assume browser environment with `window` object
- No server-side wallet operations or private key handling
- Wallet extensions provide the integration boundary

### 3. Read-Only Philosophy
- System NEVER handles private keys or transaction signing
- Only reads addresses and account information
- All mutating operations happen through wallet extensions

### 4. Chain Abstraction Pattern
- Common `WalletIntegration` interface for all chains
- Chain-specific implementations handle protocol differences
- EVM chains share implementation; non-EVM chains have dedicated classes

## Unit-Level Improvements

This architecture proposes four focused improvements to reduce duplication and improve code quality:

### 1. BlockchainAddress Type Utility
**Purpose**: Type-safe address validation and normalization

**Responsibilities**:
- Validate address format for specific chain
- Normalize address representation (e.g., lowercase for EVM)
- Provide equality comparison
- Format for display purposes

**Rationale**: Addresses are validated multiple times across integrations. A utility class centralizes this logic.

**Contract**: See `src/types/BlockchainAddress.stub.ts`

### 2. Custom Error Types
**Purpose**: Structured error information for better error handling

**Error Classes**:
- `WalletNotFoundError` - Wallet ID doesn't exist
- `ChainNotSupportedError` - Chain not supported
- `WalletNotConnectedError` - Operation requires connection
- `AccountNotFoundError` - Account address doesn't exist
- `WalletExtensionNotFoundError` - Browser extension missing
- `InvalidAddressFormatError` - Address has invalid format
- `InvalidAccountIndexError` - Account index invalid
- `ChainAlreadyActiveError` - Chain already active

**Rationale**: Current code uses generic `Error`. Custom types enable better error handling and debugging.

**Contract**: See `src/errors/WalletErrors.stub.ts`

### 3. BaseWalletIntegration Abstract Class
**Purpose**: Extract common logic from chain-specific integrations

**Shared Responsibilities**:
- Connection state management
- Account list management
- Active account tracking
- Template methods for chain-specific operations

**Template Methods** (implemented by subclasses):
- `connectToProvider()` - Chain-specific connection logic
- `disconnectFromProvider()` - Chain-specific disconnection
- `getAccountsFromProvider()` - Fetch accounts from wallet extension

**Rationale**: EVM, Solana, and SUI integrations duplicate connection state logic. Base class reduces duplication.

**Contract**: See `src/chains/BaseWalletIntegration.stub.ts`

### 4. WalletIntegrationFactory Service
**Purpose**: Create chain-specific wallet integration instances

**Responsibilities**:
- Determine correct integration class for chain
- Handle EVM vs non-EVM distinction
- Apply configuration to integrations
- Validate chain support

**Rationale**: WalletManager currently has factory logic inline. Extracting improves testability and follows Open/Closed Principle.

**Contract**: See `src/services/WalletIntegrationFactory.stub.ts`

## Provider Abstraction Strategy

The system follows an anti-corruption layer pattern:

```
External Providers → Adapter → Translation → Validation → Consumer
                      ↑         ↑            ↑            ↑
                   chains/   types/       errors/    WalletManager
```

**Unit improvements enhance each layer**:
- **Adapter**: BaseWalletIntegration (reduce duplication)
- **Translation**: BlockchainAddress (type-safe translation)
- **Validation**: Error types (better error handling)
- **Factory**: WalletIntegrationFactory (better instantiation)

## Testing Strategy

Following the Integration Domain testing pyramid (80% unit, 15% integration, 4% contract, 1% E2E):

### Unit Test Guidelines

1. **Isolation**: Mock all external dependencies (wallet extensions, providers)
2. **Determinism**: Tests must be repeatable and not depend on external state
3. **Fast**: Unit tests should complete in milliseconds
4. **Focused**: One behavior per test case
5. **Readable**: Test names describe the behavior being tested

### Test Focus Areas

- **Validation logic**: Address format validation, chain detection
- **Error handling**: Custom error construction, error messages
- **State management**: Connection state, account switching
- **Provider mocking**: Mock `window.ethereum`, `window.solana`, etc.

### Test File Organization

Tests are co-located with implementation files:

```
src/
  types/
    BlockchainAddress.ts
    BlockchainAddress.test.ts
  errors/
    WalletErrors.ts
    WalletErrors.test.ts
  chains/
    BaseWalletIntegration.ts
    BaseWalletIntegration.test.ts
  services/
    WalletIntegrationFactory.ts
    WalletIntegrationFactory.test.ts
```

### Mocking Strategy

#### Wallet Extension Mocks
```typescript
// Mock window.ethereum for EVM testing
global.window = {
  ethereum: {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
} as any;
```

#### Time-Based Mocks
```typescript
// Mock Date for connection timestamps
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));
```

## Implementation Guidelines

### TDD Workflow

1. **Read JSDoc Contract**: Understand expected behavior from stub
2. **Write Test First**: Implement test cases from specification
3. **Run Test (Red)**: Verify test fails as expected
4. **Implement Minimal Code**: Write simplest code to pass test
5. **Run Test (Green)**: Verify test passes
6. **Refactor**: Improve code while keeping tests green
7. **Repeat**: Move to next test case

### Code Quality Standards

1. **TypeScript Strict Mode**: Enable all strict checks
2. **No `any` Types**: Use proper types or `unknown` with guards
3. **Immutability**: Prefer `readonly` and spread operators
4. **Pure Functions**: Avoid side effects where possible
5. **Explicit Error Handling**: Use custom error types, not generic Error

### Dependency Management

1. **Dependency Injection**: Constructor-based injection for services
2. **Interface Segregation**: Small, focused interfaces
3. **Inversion of Control**: Depend on abstractions, not concretions

### Documentation Requirements

1. **Public API**: All public methods must have JSDoc
2. **Complex Logic**: Inline comments for non-obvious code
3. **Type Definitions**: Export all types from index files
4. **Examples**: Include usage examples in JSDoc

## File Structure

```
src/
├── chains/                           # Existing - chain-specific integrations
│   ├── BaseWalletIntegration.ts     # NEW - extract common logic
│   ├── BaseWalletIntegration.test.ts
│   ├── evm/                         # Existing
│   ├── solana/                      # Existing
│   └── sui/                         # Existing
├── services/                         # Existing - cross-cutting services
│   ├── WalletManager.ts             # Existing
│   ├── WalletIntegrationFactory.ts  # NEW - extract factory logic
│   └── WalletIntegrationFactory.test.ts
├── types/                            # Existing - type definitions
│   ├── index.ts                     # Existing - keep interfaces as-is
│   ├── BlockchainAddress.ts         # NEW - type utility for addresses
│   └── BlockchainAddress.test.ts
├── errors/                           # NEW - custom error types
│   ├── WalletErrors.ts              # NEW - all error classes
│   └── WalletErrors.test.ts
└── utils/                            # Existing - utilities
    └── constants.ts                 # Existing
```

## Migration Path

### Phase 1: Error Types (Low Risk)
1. Implement custom error classes in `src/errors/`
2. Replace generic errors in existing code
3. Update tests to check error types

**Impact**: Improves error handling and debugging. No breaking changes.

### Phase 2: BlockchainAddress Type Utility (Low Risk)
1. Implement in `src/types/BlockchainAddress.ts`
2. Use in existing integration classes for validation
3. Keep existing `string` types in interfaces (backwards compatible)

**Impact**: Centralizes validation logic. Gradual adoption possible.

### Phase 3: WalletIntegrationFactory (Medium Risk)
1. Implement in `src/services/WalletIntegrationFactory.ts`
2. Refactor WalletManager to use factory
3. Update tests

**Impact**: Improves testability. Requires WalletManager refactor.

### Phase 4: BaseWalletIntegration (Medium Risk)
1. Implement abstract base class in `src/chains/`
2. Refactor one integration (e.g., SUI) to extend base
3. Verify no behavioral changes
4. Refactor remaining integrations (EVM, Solana)

**Impact**: Reduces code duplication significantly. Requires careful refactoring.

## Metrics and Quality Gates

### Code Coverage Targets
- Type Utilities: 100%
- Error Types: 100%
- Factory Service: 95%
- Base Integration: 90%
- Chain Integrations: 80% (existing target)

### Static Analysis
- No TypeScript errors
- No ESLint warnings
- Cyclomatic complexity < 10 per function
- Max function length: 50 lines
- Max file length: 500 lines

### Performance
- Unit test suite < 5 seconds
- Integration test suite < 30 seconds
- E2E test suite < 5 minutes

## References

### Implementation Resources
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Step-by-step guide for implementing this architecture using TDD
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System-level architecture and patterns

### Books & Articles
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.com/iddd/)
- [Test-Driven Development by Kent Beck](https://www.kentbeck.com/)
