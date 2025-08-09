# @cygnus-wealth/wallet-integration-system

Multi-chain wallet integration system for CygnusWealth that handles read-only wallet connections and balance fetching across Ethereum/EVM chains, Solana, and SUI.

## Features

- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Base, Solana, and SUI
- **Wallet Integrations**: MetaMask/Rabby (EVM), Phantom (Solana), Slush/Suiet (SUI)
- **Balance Aggregation**: Fetch native and token balances across all connected wallets
- **Token Price Service**: Real-time price fetching with caching via CoinGecko API
- **Portfolio Calculation**: Calculate total portfolio value with chain and asset breakdowns
- **TypeScript Support**: Fully typed with @cygnus-wealth/data-models integration

## Installation

```bash
npm install
```

## Usage

### Basic Wallet Connection

```typescript
import { WalletManager, Chain, IntegrationSource } from '@cygnus-wealth/wallet-integration-system';

const walletManager = new WalletManager();

// Connect to MetaMask on Ethereum
const connection = await walletManager.connectWallet(
  Chain.ETHEREUM, 
  IntegrationSource.METAMASK
);

// Get all balances
const balances = await walletManager.getAllBalances();

// Disconnect wallet
await walletManager.disconnectWallet(Chain.ETHEREUM);
```

### Using Custom RPC Endpoints

```typescript
import { WalletManager, WalletIntegrationConfig } from '@cygnus-wealth/wallet-integration-system';

// Configure custom RPC (useful for Solana and Sui)
const config: WalletIntegrationConfig = {
  rpcUrl: 'https://rpc.ankr.com/solana' // Example: Ankr's Solana RPC
};

const walletManager = new WalletManager(config);

// Connect with custom RPC
await walletManager.connectWallet(Chain.SOLANA, IntegrationSource.PHANTOM);
```

### Portfolio Value Calculation

```typescript
import { PortfolioCalculator } from '@cygnus-wealth/wallet-integration-system';

const calculator = new PortfolioCalculator();
const balances = await walletManager.getAllBalances();

// Calculate portfolio with prices
const portfolio = await calculator.calculatePortfolioValue(balances);

console.log('Total Value:', portfolio.totalValue.amount);

// Get chain breakdown
const chainBreakdown = calculator.calculateChainBreakdown(portfolio);

// Get top assets
const topAssets = calculator.getTopAssets(portfolio, 5);
```

### Direct Chain Integration

```typescript
import { EVMWalletIntegration, Chain, IntegrationSource } from '@cygnus-wealth/wallet-integration-system';

// Direct EVM integration
const evmWallet = new EVMWalletIntegration(Chain.ETHEREUM, IntegrationSource.METAMASK);
await evmWallet.connect();
const balances = await evmWallet.getBalances();
```

### Solana WebSocket Real-time Updates

```typescript
import { SolanaWalletIntegration } from '@cygnus-wealth/wallet-integration-system';

const solanaWallet = new SolanaWalletIntegration();

// Connect to wallet
const connection = await solanaWallet.connect();

// Subscribe to real-time balance updates
const unsubscribe = await solanaWallet.subscribeToBalances(
  connection.address,
  (balances) => {
    console.log('Balance updated:', balances);
  }
);

// Check connection status
const status = solanaWallet.getConnectionStatus();
console.log('Using WebSocket:', status.isWebSocket);
console.log('Current endpoint:', status.rpcEndpoint);

// Manual reconnection if needed
await solanaWallet.reconnect();

// Cleanup when done
unsubscribe();
await solanaWallet.disconnect();
```

### SUI WebSocket Real-time Updates

```typescript
import { SuiWalletIntegration } from '@cygnus-wealth/wallet-integration-system';

const suiWallet = new SuiWalletIntegration(Chain.SUI, IntegrationSource.SUIET);

// Connect to wallet
const connection = await suiWallet.connect();

// Subscribe to real-time balance updates
const unsubscribe = await suiWallet.subscribeToBalances(
  connection.address,
  (balances) => {
    console.log('Balance updated:', balances);
  }
);

// Check connection status
const status = suiWallet.getConnectionStatus();
console.log('Using WebSocket:', status.isWebSocket);
console.log('Current endpoint:', status.rpcEndpoint);

// Manual reconnection if needed
await suiWallet.reconnect();

// Cleanup when done
unsubscribe();
await suiWallet.disconnect();
```

## Supported Wallets

### EVM Chains (Ethereum, BSC, Polygon, etc.)
- **MetaMask** - Primary EVM wallet support
- **Rabby** - Works via same interface as MetaMask
- Any wallet that injects `window.ethereum`

### Solana
- **Phantom** - Primary Solana wallet
- **WebSocket Support** - Real-time balance updates via WebSocket connections
- **Multiple RPC Endpoints** - Automatic failover across multiple endpoints
- **Robust Reconnection** - Exponential backoff with HTTP polling fallback

### Sui
- **Slush** (formerly Sui Wallet) - Official Sui wallet by Mysten Labs
- **Suiet** - Alternative Sui wallet
- **WebSocket Support** - Real-time balance updates via WebSocket connections
- **Multiple RPC Endpoints** - Automatic failover across multiple endpoints
- **Robust Reconnection** - Exponential backoff with HTTP polling fallback

Note: The library automatically detects available wallets. For Sui, it supports both the legacy window injection method (Suiet) and the modern Wallet Standard (Slush).

## API Reference

### WalletManager

Main class for managing multi-chain wallet connections.

- `connectWallet(chain: Chain, source: IntegrationSource): Promise<WalletConnection>`
- `disconnectWallet(chain: Chain): Promise<void>`
- `getAllBalances(): Promise<WalletBalance[]>`
- `getBalancesByChain(chain: Chain): Promise<WalletBalance[]>`
- `getConnectedWallets(): WalletConnection[]`
- `refreshBalances(): Promise<void>`

### TokenPriceService

Singleton service for fetching token prices.

- `getTokenPrice(address: string, chain: Chain, coingeckoId?: string): Promise<Price | null>`
- `getMultipleTokenPrices(tokens: TokenInfo[]): Promise<Map<string, Price>>`

### PortfolioCalculator

Utility class for portfolio calculations.

- `calculatePortfolioValue(balances: WalletBalance[]): Promise<Portfolio>`
- `calculateChainBreakdown(portfolio: Portfolio): Map<Chain, BreakdownInfo>`
- `getTopAssets(portfolio: Portfolio, limit: number): PortfolioItem[]`

## Data Model Integration

This library uses `@cygnus-wealth/data-models` for standardized data structures:

- `Balance`: Token balance information
- `Asset`: Token/asset details
- `Portfolio`: Aggregated portfolio data
- `Chain`: Supported blockchain networks
- `IntegrationSource`: Wallet providers

## Error Handling

All methods throw errors for common scenarios:
- Wallet not installed
- User rejection
- Network errors
- Invalid chain configuration

Always wrap calls in try-catch blocks:

```typescript
try {
  const connection = await walletManager.connectWallet(Chain.ETHEREUM, IntegrationSource.METAMASK);
} catch (error) {
  console.error('Failed to connect wallet:', error);
}
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck
```