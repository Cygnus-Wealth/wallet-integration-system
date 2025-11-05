# Quick Demo Guide

## 🚀 Run the Demos

### Terminal Demo (Fastest)
```bash
npm run demo
```

**What you'll see:**
- Automated demonstration of all features
- Colored terminal output
- All 4 implementation phases
- Error handling examples
- Complete workflow demonstration

**Duration:** ~15 seconds

---

### Browser Demo (Visual)
```bash
npm run demo:browser
# Or manually open: demo/index.html
```

**What you'll see:**
- Beautiful visual interface
- Interactive wallet connections
- Account management
- Live console output
- Factory testing

**Features:**
- Connect to simulated wallets
- Switch between accounts
- Test all 9 chains
- View detailed logs

---

## 📊 What Gets Demonstrated

### ✅ Phase 1: Error Types (31 tests)
- 8 custom error classes
- Proper error inheritance
- Contextual error information
- Stack trace preservation

### ✅ Phase 2: BlockchainAddress (21 tests)
- EVM address validation (42 chars, 0x prefix)
- Solana address validation (32-44 chars, base58)
- SUI address validation (66 chars)
- Case-insensitive equality
- Address normalization

### ✅ Phase 3: WalletIntegrationFactory (29 tests)
- Factory pattern for chain-specific integrations
- Support for 9 chains (7 EVM + Solana + SUI)
- Chain validation
- Error handling for unsupported chains

### ✅ Phase 4: BaseWalletIntegration (33 tests)
- Template method pattern
- Connection state management
- Account management
- Account switching (case-insensitive)

---

## 🎯 Quick Commands

```bash
# Run CLI demo
npm run demo

# Open browser demo
npm run demo:browser

# Run all tests
npm test

# Type checking
npm run typecheck

# Build project
npm run build
```

---

## 📖 Full Documentation

See `demo/README.md` for complete demo documentation including:
- Detailed feature descriptions
- Troubleshooting guide
- Real wallet testing instructions
- Customization options

---

## ✨ Demo Highlights

**Terminal Demo:**
```
╔════════════════════════════════════════════════════════════╗
║        Wallet Integration System - CLI Demo               ║
╚════════════════════════════════════════════════════════════╝

✓ Created EVM integration: ETHEREUM via METAMASK
✓ Created Solana integration: SOLANA via PHANTOM
✓ Created SUI integration: SUI via SUIET

✓ Total: 133/133 tests passing
```

**Browser Demo:**
- Visual status indicators (Connected/Disconnected)
- Account list with active highlighting
- Live console with colored output
- Factory testing buttons

---

## 🏗️ Architecture

Both demos showcase:
- **Infrastructure/Adapter Layer** design
- **Template Method Pattern** (BaseWalletIntegration)
- **Factory Pattern** (WalletIntegrationFactory)
- **Value Object Pattern** (BlockchainAddress)
- **Custom Error Hierarchy**

---

## 📈 Test Coverage

```
Test Files: 7 passed
Tests: 133 passed (133 total)
- Error Types: 31 tests ✅
- BlockchainAddress: 21 tests ✅
- WalletIntegrationFactory: 29 tests ✅
- BaseWalletIntegration: 33 tests ✅
- Integration tests: 8 tests ✅
- Multi-account tests: 9 tests ✅
- E2E tests: 2 tests ✅
```

---

## 🔗 Next Steps

1. **Explore the demos** to understand the architecture
2. **Read UNIT_ARCHITECTURE.md** for design decisions
3. **Check the tests** in `src/**/*.test.ts`
4. **Review the implementation** in `src/`
5. **Integrate into your app** following the patterns shown

---

**Built with TDD** 🧪 | **DDD Principles** 🏗️ | **100% Passing Tests** ✅
