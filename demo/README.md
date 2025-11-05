# Wallet Integration System - Demo Applications

This directory contains two demo applications for manually testing the wallet integration system.

## Quick Start

### Option 1: Browser Demo (Recommended for Visual Testing)

Open the HTML demo in your browser:

```bash
# From the project root
cd demo
firefox index.html  # or chrome, chromium, etc.
```

**Features:**
- Visual interface with styled components
- Simulated wallet connections (no real wallet extensions needed)
- Live console output
- Account switching
- Factory testing
- Works without any build step

### Option 2: Terminal Demo (Recommended for Quick Testing)

Run the CLI demo in your terminal:

```bash
# From the project root
npm run demo

# Or directly with tsx
npx tsx demo/cli-demo.ts
```

**Features:**
- Colored terminal output
- Automated demonstration of all features
- Shows all 4 implementation phases
- Error handling examples
- Complete workflow demonstration

## Browser Demo Guide

### What You Can Test

1. **Multi-Chain Support**
   - Select from 9 supported chains (7 EVM + Solana + SUI)
   - Each chain uses appropriate wallet source

2. **Connection Management**
   - Connect to simulated wallets
   - View connection status
   - Disconnect cleanly

3. **Account Management**
   - View all accounts
   - Switch between accounts
   - See active account highlighting

4. **Factory Testing**
   - Test `WalletIntegrationFactory` methods
   - View supported chains
   - Test chain validation

### Demo Workflow

1. **Select a blockchain** from the dropdown (default: Ethereum)
2. **Click "Connect Wallet"** to simulate connection
3. **View accounts** in the accounts panel
4. **Switch accounts** by clicking the "Switch" button
5. **Click "Test Factory"** to see factory operations
6. **Monitor the console** for detailed logs
7. **Click "Disconnect"** to clean up

### Console Output

The console shows color-coded logs:
- 🟢 **Green (Success)**: Successful operations
- 🔵 **Blue (Info)**: General information
- 🔴 **Red (Error)**: Errors and failures

## Terminal Demo Guide

### What It Demonstrates

The terminal demo runs 4 automated demonstrations:

#### Demo 1: WalletIntegrationFactory
- Lists all supported chains
- Tests `isChainSupported()` for various chains
- Creates integrations for EVM, Solana, and SUI
- Shows error handling for unsupported chains

#### Demo 2: BlockchainAddress
- Validates EVM addresses with normalization
- Tests invalid address detection
- Creates Solana and SUI addresses
- Demonstrates case-insensitive equality

#### Demo 3: Custom Error Types
- Shows all custom error classes
- Demonstrates proper error inheritance
- Verifies stack trace preservation
- Tests `instanceof` checks

#### Demo 4: Complete Workflow
- Shows a typical integration workflow
- Factory → Chain validation → Integration creation → Address validation
- Demonstrates how components work together

### Customizing the Demo

Edit `demo/cli-demo.ts` to:
- Add more test cases
- Change timing (adjust `sleep()` calls)
- Test specific scenarios
- Add your own demonstrations

## Architecture Demonstrated

Both demos showcase the 4-phase implementation:

### Phase 1: Error Types ✅
```typescript
// Custom error hierarchy
WalletNotFoundError
ChainNotSupportedError
WalletNotConnectedError
AccountNotFoundError
WalletExtensionNotFoundError
InvalidAddressFormatError
InvalidAccountIndexError
ChainAlreadyActiveError
```

### Phase 2: BlockchainAddress ✅
```typescript
// Type-safe address validation
const address = BlockchainAddress.create(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC',
  Chain.ETHEREUM
);

console.log(address.display()); // "0x742d...bebc"
console.log(address.value);     // "0x742d35cc6634c0532925a3b844bc9e7595f0bebc"
```

### Phase 3: WalletIntegrationFactory ✅
```typescript
// Factory pattern for chain-specific integrations
const factory = new WalletIntegrationFactory();

const integration = factory.create(
  Chain.ETHEREUM,
  IntegrationSource.METAMASK
);

console.log(factory.getSupportedChains()); // All 9 chains
console.log(factory.isChainSupported(Chain.ETHEREUM)); // true
```

### Phase 4: BaseWalletIntegration ✅
```typescript
// Template method pattern (shown in real integrations)
class EVMWalletIntegration extends BaseWalletIntegration {
  protected async connectToProvider(): Promise<Account[]> {
    // Chain-specific connection logic
  }

  protected async disconnectFromProvider(): Promise<void> {
    // Chain-specific disconnection
  }

  protected async getAccountsFromProvider(): Promise<Account[]> {
    // Fetch accounts from provider
  }
}
```

## Testing Real Wallets

To test with real wallet extensions:

1. **Install wallet extensions:**
   - MetaMask (for EVM chains)
   - Phantom (for Solana)
   - Suiet (for SUI)

2. **Modify the browser demo** to use real wallet APIs instead of simulations

3. **Update the connection logic** in `demo/index.html`:
   ```javascript
   // Replace DemoWalletIntegration with actual integration classes
   import { EVMWalletIntegration } from '../dist/chains/evm/EVMWalletIntegration.js';
   import { SolanaWalletIntegration } from '../dist/chains/solana/SolanaWalletIntegration.js';
   import { SuiWalletIntegration } from '../dist/chains/sui/SuiWalletIntegration.js';
   ```

4. **Build the project first:**
   ```bash
   npm run build
   ```

## Troubleshooting

### Browser Demo Issues

**Issue:** Demo doesn't load
- **Solution:** Open directly from filesystem (file://) or use a local server

**Issue:** No wallet extension detected
- **Solution:** The demo uses simulations by default - this is expected

### Terminal Demo Issues

**Issue:** `tsx` command not found
- **Solution:** Install tsx globally: `npm install -g tsx`
- **Or use:** `npx tsx demo/cli-demo.ts`

**Issue:** Import errors
- **Solution:** Make sure you're running from the project root
- **Check:** All TypeScript files are compiled (`npm run build`)

**Issue:** Colors not showing
- **Solution:** Your terminal may not support ANSI colors
- **Try:** Different terminal emulator

## Next Steps

After testing the demos:

1. **Explore the tests:** See `src/**/*.test.ts` for comprehensive test coverage
2. **Read the architecture:** Check `UNIT_ARCHITECTURE.md` for design decisions
3. **Review implementation:** Examine the source code in `src/`
4. **Run full test suite:** `npm test` to see all 133 tests
5. **Build for production:** `npm run build` to compile TypeScript

## Demo Statistics

- **Total Tests:** 133 passing
- **Code Coverage:** High (see `npm test -- --coverage`)
- **Supported Chains:** 9 (7 EVM + Solana + SUI)
- **Error Types:** 8 custom error classes
- **Demo Files:** 2 (HTML + CLI)

## Feedback

If you find issues with the demos:
1. Check the console/terminal output for errors
2. Review the implementation in `src/`
3. Run the test suite: `npm test`
4. Check TypeScript compilation: `npm run typecheck`

---

**Built with Test-Driven Development (TDD)** 🧪
**Following Domain-Driven Design (DDD) principles** 🏗️
**133/133 tests passing** ✅
