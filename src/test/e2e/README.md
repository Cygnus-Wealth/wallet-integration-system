# E2E Testing for Wallet Integration

This directory contains end-to-end tests using mock providers for reliable, fast testing.

## Available Tests

### 1. Browser-based Mock Tests
```bash
npm run test:e2e
```

Features:
- Uses Puppeteer with mock Ethereum providers
- Tests in real browser environment
- Verifies wallet connection flows
- Tests multi-chain support
- Runs in headless mode

### 2. Node.js Mock Tests
```bash
npm run test:e2e:mock
```

Features:
- Tests the built library directly
- Mocks window.ethereum provider
- Verifies all wallet operations
- Perfect for CI/CD pipelines

## Why Mock Tests?

1. **Reliability**: No dependency on browser extensions or external services
2. **Speed**: Tests complete in seconds
3. **Coverage**: Tests all functionality including multi-chain operations
4. **CI/CD Compatible**: Works in any environment
5. **Deterministic**: Same results every time

## Test Coverage

Both test suites verify:
- ✅ Wallet connection
- ✅ Multi-chain support (all 7 EVM chains)
- ✅ Balance fetching
- ✅ Chain switching
- ✅ Error handling

## Running Tests

```bash
# Run all tests including E2E
npm test

# Run only E2E browser tests
npm run test:e2e

# Run only E2E Node.js tests
npm run test:e2e:mock
```