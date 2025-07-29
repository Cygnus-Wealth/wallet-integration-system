# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev         # Run TypeScript compiler in watch mode
npm run build       # Build the project (outputs to dist/)
npm run typecheck   # Check TypeScript types without emitting files
```

### Testing
```bash
npm test            # Run all tests once
npm test:watch      # Run tests in watch mode
npm test src/test/integration.test.ts  # Run a specific test file
```

### Code Quality
```bash
npm run lint        # Run ESLint on src directory
```

## Architecture Overview

This is a multi-chain wallet integration library that provides a unified interface for connecting to and reading data from various blockchain wallets. The library follows a read-only approach, never handling private keys or transaction signing.

### Core Design Patterns

1. **Chain-Specific Adapters**: Each blockchain has its own integration class (`EVMWalletIntegration`, `SolanaWalletIntegration`, `SuiWalletIntegration`) that implements the common `WalletIntegration` interface.

2. **Unified Manager**: `WalletManager` acts as a facade that creates and manages chain-specific integrations, providing a single interface for multi-chain operations.

3. **Service Layer**: 
   - `TokenPriceService`: Singleton for price fetching with built-in caching
   - `PortfolioCalculator`: Stateless calculator for portfolio aggregation

### Key Architectural Decisions

1. **Data Model Integration**: The library depends on `@cygnus-wealth/data-models` for standardized interfaces. However, some interfaces (like `Portfolio` and `Price`) don't fully match requirements, so the library includes:
   - Custom `WalletPortfolio` and `PortfolioAsset` types in `src/types/portfolio.ts`
   - Type casting workarounds (e.g., `(price as any).value`) 
   - See `SUGGESTED_DATA_MODEL_CHANGES.md` for proposed improvements

2. **Chain Support**: 
   - EVM chains share a single implementation with chain-specific configs in `utils/constants.ts`
   - Non-EVM chains (Solana, SUI) have dedicated implementations
   - BASE chain is not in the data-models enum, so it's excluded from constants

3. **Browser-Only Design**: All integrations assume browser environment with wallet extensions (MetaMask, Phantom, Suiet). No server-side wallet operations.

### Working with Wallets

Each wallet integration follows this pattern:
1. Check if wallet extension exists (`window.ethereum`, `window.solana`, etc.)
2. Request connection/permissions
3. Fetch balances (native token + other tokens)
4. Format results using data-models interfaces

### Price Integration

`TokenPriceService` uses CoinGecko API with:
- 5-minute cache duration
- Support for fetching by CoinGecko ID or contract address
- Batch fetching for performance

### Testing Approach

Tests use Vitest and focus on unit testing without requiring actual wallet connections. Integration tests mock the window wallet objects.

## Important Context

1. This is part of the larger CygnusWealth project - a privacy-focused, client-side portfolio tracker
2. All operations must be read-only (no transaction signing)
3. The library is designed to work in browsers only, not Node.js environments
4. When the data-models interfaces don't match needs, create local types rather than breaking compatibility