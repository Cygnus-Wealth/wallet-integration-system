# Wallet Integration System - Architecture

> **Breadcrumbs**: [Integration Domain](../enterprise-arch/domains/integration/README.md) > [Bounded Contexts](../enterprise-arch/domains/integration/README.md#bounded-contexts) > [Wallet Integration System](../enterprise-arch/domains/integration/bounded-contexts/wallet-integration-system.md) > **System Architecture**

## Overview

This document provides system-level architectural guidance for the wallet-integration-system bounded context. It translates domain architect directives into actionable module design, library selections, and integration patterns while maintaining alignment with Integration Domain principles.

**Target Audience**: Developers implementing features, writing tests, and maintaining the codebase.

**Scope**: This architecture covers the internal structure of the wallet-integration-system repository. For domain-level context and strategic guidance, see the [Wallet Integration System Bounded Context](../enterprise-arch/domains/integration/bounded-contexts/wallet-integration-system.md) specification.

## System Responsibilities

The wallet-integration-system provides:

1. **Wallet Connection Management**: Establish and maintain connections to browser wallet providers
2. **Multi-Account Support**: Handle multiple accounts within a single wallet
3. **Multi-Wallet Coordination**: Manage multiple wallet instances simultaneously
4. **Address Discovery**: Retrieve and manage wallet addresses across chains
5. **Connection State Management**: Track and persist connection status

**Out of Scope**: Balance fetching, transaction history, transaction signing, private key handling, portfolio calculation (these belong to other bounded contexts).

## Code Organization

This repository is organized as a single npm package with functional directories. The codebase is structured into the following directories:

### Core Directories

```
src/
├── chains/              # Chain-specific wallet integrations
│   ├── evm/            # EVM-compatible chains (Ethereum, BSC, Polygon, etc.)
│   ├── solana/         # Solana blockchain
│   └── sui/            # Sui blockchain
├── services/           # Cross-chain wallet management services
├── types/              # TypeScript type definitions
└── utils/              # Shared utilities and constants
```

### Directory Responsibilities

#### Chain Integrations Directory (`src/chains/`)

Each chain directory implements the provider abstraction pattern:

- **EVM Directory** (`chains/evm/`): Handles all EVM-compatible chains through a unified integration
  - Uses ethers.js for provider abstraction
  - Supports EIP-1193 compliant wallets (MetaMask, Rabby, etc.)
  - Chain-specific configurations in `utils/constants.ts`

- **Solana Directory** (`chains/solana/`): Solana-specific wallet integration
  - Uses @solana/web3.js for blockchain interaction
  - Supports Phantom wallet provider

- **Sui Directory** (`chains/sui/`): Sui blockchain wallet integration
  - Uses @mysten/sui.js SDK
  - Supports Wallet Standard and legacy providers (Slush, Suiet)

**Pattern**: Each directory exports a `*WalletIntegration` class implementing the connection lifecycle for that chain family.

#### Services Directory (`src/services/`)

Cross-cutting wallet management services:

- **WalletManager**: Facade for multi-chain wallet operations
  - Coordinates chain-specific integrations
  - Manages multi-wallet instances
  - Provides unified interface to consumers

**Pattern**: WalletManager uses the Facade pattern to hide chain-specific complexity.

## Library Selection

### Blockchain SDKs

| Library | Purpose | Justification |
|---------|---------|---------------|
| ethers.js | EVM chain interaction | Industry standard, well-maintained, supports all EVM chains |
| @solana/web3.js | Solana blockchain | Official Solana SDK, comprehensive wallet support |
| @mysten/sui.js | Sui blockchain | Official Sui SDK by Mysten Labs |

### Data Model Integration

| Library | Purpose | Justification |
|---------|---------|---------------|
| @cygnus-wealth/data-models | Standardized types | Contract domain published language for cross-context communication |

**Note**: The data-models integration has known gaps documented in `SUGGESTED_DATA_MODEL_CHANGES.md`. Use local type extensions in `src/types/` when data-models interfaces are insufficient.

## Integration Patterns

### Anti-Corruption Layer

The wallet-integration-system serves as an anti-corruption layer between external wallet providers and the CygnusWealth domain:

```
External Providers → Adapter → Translation → Validation → Domain Types
```

**Implementation Locations**:
- Adapter: Chain-specific `*WalletIntegration` classes
- Translation: Type mapping in `src/types/index.ts`
- Validation: Input validation within integration classes
- Domain Types: `@cygnus-wealth/data-models` and local extensions

### Connection Management Pattern

**State Machine**: Connection states are managed explicitly:
- Not connected
- Connecting
- Connected
- Disconnecting
- Error

**Implementation**: Each `*WalletIntegration` class manages its own connection state. WalletManager aggregates these states.

### Provider Abstraction Strategy

**Challenge**: Each blockchain has different wallet standards (EIP-1193, Wallet Standard, custom APIs).

**Solution**: Adapter pattern with chain-specific implementations:
1. Each chain integration adapts its provider API to a common interface
2. WalletManager works with the common interface only
3. Chain-specific logic isolated within integration classes

## Testing Strategy

Following the Integration Domain testing pyramid (80% unit, 15% integration, 4% contract, 1% E2E):

### Unit Tests (80%)

**Location**: Co-located with implementation files

**Focus**:
- Connection state management logic
- Address validation and normalization
- Type transformations
- Error handling paths

**Pattern**: Mock wallet providers using test doubles

### Integration Tests (15%)

**Location**: `src/test/integration.test.ts`, `src/test/multi-account.test.ts`

**Focus**:
- End-to-end connection flows with mocked providers
- Multi-wallet coordination
- Account switching
- Error recovery

**Pattern**: Use mock wallet objects to simulate browser wallet APIs

### E2E Tests (1%)

**Location**: `src/test/e2e/`

**Focus**: Critical paths only
- Complete connection flow in browser environment
- Real wallet extension interactions (testnet)

**Tooling**: Browser automation for wallet interactions

## Security Architecture

### Read-Only Guarantee

**Enforcement Layers**:
1. **API Design**: No methods accepting private keys or signing transactions
2. **Type System**: Types enforce read-only operations
3. **Documentation**: Clear scope documentation preventing feature creep

**Implementation**: All methods are read-only by design. No write operations to blockchain.

### Input Validation

**Requirements**:
- Validate all addresses before use (format, checksum)
- Sanitize user inputs
- Validate provider responses

**Implementation**: Validation functions in integration classes before accepting external data.

### Provider Trust Boundary

**Assumption**: External wallet providers are untrusted.

**Mitigation**:
- Validate all data from providers
- Handle provider errors gracefully
- Never expose internal state to providers

## Performance Considerations

### Connection Pooling

**Not Applicable**: Browser wallet connections are stateful, singleton-like resources. Connection pooling patterns don't apply.

### State Caching

**Pattern**: Cache connected wallet state to minimize provider calls
- Cache connected addresses
- Cache account lists
- Invalidate cache on disconnect

**Implementation**: In-memory caching within WalletManager service

## Error Handling

### Error Categories

1. **Provider Errors**: Wallet not installed, user rejection
2. **Network Errors**: Chain unavailable, RPC issues
3. **Validation Errors**: Invalid addresses, unsupported chains

### Recovery Strategies

- **Provider Not Found**: Guide user to install wallet
- **User Rejection**: Clear messaging, allow retry
- **Network Issues**: Retry with exponential backoff (future enhancement)

**Implementation**: Custom error classes with recovery guidance in error messages

## Configuration Management

### Chain Configuration

**Location**: `src/utils/constants.ts`

**Content**:
- Supported chains with metadata
- RPC endpoints (if needed for validation)
- Chain-specific parameters

**Pattern**: Centralized constants file for all chain configurations

### Runtime Configuration

**Minimal**: This library is browser-only with minimal runtime config.

**Future**: Consider environment-based config for RPC endpoints if validation requires it.

## Browser Compatibility

### Requirements

- Modern browsers with ES2020+ support
- Browsers with wallet extension support (Chrome, Firefox, Brave, Edge)

### Provider Detection

**Pattern**: Feature detection for wallet providers
- Check `window.ethereum` for EVM wallets
- Check `window.solana` for Solana wallets
- Check Wallet Standard API for Sui wallets

**Implementation**: Runtime checks in integration class constructors

## Future Evolution

### Planned Enhancements (from Domain Architect Review)

1. **Event Architecture**: Implement domain event publishing for connection state changes
2. **Session Persistence**: Add session management for connection state across page refreshes
3. **Circuit Breaker**: Add resilience patterns for provider failures
4. **Health Monitoring**: Add provider health checks

### Extension Points

**Designed for Extension**:
- Adding new chains: Create new directory in `src/chains/`
- Adding new wallet providers: Extend provider detection in integration classes
- Adding new features: Extend WalletManager facade

## Development Workflow

### Commands

See `CLAUDE.md` for complete command reference.

**Key Commands**:
- `npm run dev`: TypeScript compiler in watch mode
- `npm test`: Run all tests
- `npm run typecheck`: Type checking
- `npm run build`: Production build

### Adding a New Chain

1. Create new directory in `src/chains/<chain-name>/`
2. Implement `<ChainName>WalletIntegration` class
3. Add chain constants to `src/utils/constants.ts`
4. Update WalletManager to support new chain
5. Add tests in `src/test/`
6. Update type exports in `src/index.ts`

## Related Documentation

- **[← Wallet Integration System Bounded Context](../enterprise-arch/domains/integration/bounded-contexts/wallet-integration-system.md)** - Domain-level specification
- **[← Integration Domain README](../enterprise-arch/domains/integration/README.md)** - Strategic domain guidance
- **[Integration Patterns](../enterprise-arch/domains/integration/patterns.md)** - Recommended implementation patterns
- **[Resilience & Performance](../enterprise-arch/domains/integration/resilience-performance.md)** - Performance optimization strategies
- **[Testing & Security](../enterprise-arch/domains/integration/testing-security.md)** - Testing and security requirements
- **[CLAUDE.md](./CLAUDE.md)** - Development commands and context
- **[README.md](./README.md)** - User-facing library documentation

---

**Document Maintenance**: Update this architecture document when:
- Adding new directories or services
- Changing integration patterns
- Updating library dependencies
- Implementing domain architect recommendations
