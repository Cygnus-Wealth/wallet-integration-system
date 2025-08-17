# @cygnus-wealth/wallet-integration-system

Multi-chain wallet integration system for CygnusWealth that handles wallet connections and retrieving network/address information across Ethereum/EVM chains, Solana, and SUI.

## Features

- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Base, Solana, and SUI
- **Wallet Integrations**: MetaMask/Rabby (EVM), Phantom (Solana), Slush/Suiet (SUI)
- **Multi-Account Management**: Support for multiple accounts per wallet
- **Multi-Wallet Support**: Manage multiple wallet instances
- **TypeScript Support**: Fully typed with @cygnus-wealth/data-models integration
- **Read-Only Operations**: Focus on wallet connection and address retrieval only

## Installation

```bash
npm install @cygnus-wealth/wallet-integration-system
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

console.log('Connected address:', connection.address);
console.log('Available accounts:', connection.accounts);

// Get all accounts for the chain
const accounts = await walletManager.getAllAccountsForChain(Chain.ETHEREUM);

// Disconnect wallet
await walletManager.disconnectWallet(Chain.ETHEREUM);
```

### Multi-Account Support

```typescript
// Get all accounts for a connected chain
const accounts = await walletManager.getAllAccountsForChain(Chain.ETHEREUM);

accounts.forEach(account => {
  console.log(`Account ${account.index}: ${account.address}`);
  console.log(`Label: ${account.label}`);
});

// Switch to a different account
if (accounts.length > 1) {
  await walletManager.switchAccountForChain(Chain.ETHEREUM, accounts[1].address);
}
```

### Multi-Wallet Management

```typescript
// Add multiple wallets
const personalWallet = await walletManager.addWallet('Personal');
const businessWallet = await walletManager.addWallet('Business');

// Switch between wallets
await walletManager.switchWallet(businessWallet.id);

// Get all wallets
const wallets = walletManager.getAllWallets();

// Remove a wallet
await walletManager.removeWallet(personalWallet.id);
```

### Connect to All EVM Chains

```typescript
// Connect to all supported EVM chains with a single call
const { connections } = await walletManager.connectAllEVMChains(
  IntegrationSource.METAMASK
);

connections.forEach(conn => {
  console.log(`Connected to ${conn.chain}: ${conn.address}`);
});
```

### Direct Chain Integration

```typescript
import { EVMWalletIntegration, Chain, IntegrationSource } from '@cygnus-wealth/wallet-integration-system';

// Direct EVM integration
const evmWallet = new EVMWalletIntegration(Chain.ETHEREUM, IntegrationSource.METAMASK);
const connection = await evmWallet.connect();
const accounts = await evmWallet.getAllAccounts();
```

## Supported Wallets

### EVM Chains (Ethereum, BSC, Polygon, etc.)
- **MetaMask** - Primary EVM wallet support
- **Rabby** - Works via same interface as MetaMask
- Any wallet that injects `window.ethereum`

### Solana
- **Phantom** - Primary Solana wallet

### Sui
- **Slush** (formerly Sui Wallet) - Official Sui wallet by Mysten Labs
- **Suiet** - Alternative Sui wallet

Note: The library automatically detects available wallets. For Sui, it supports both the legacy window injection method (Suiet) and the modern Wallet Standard (Slush).

## API Reference

### WalletManager

Main class for managing multi-chain wallet connections.

#### Methods

- `connectWallet(chain: Chain, source: IntegrationSource): Promise<WalletConnection>`
  - Connect to a specific blockchain wallet

- `disconnectWallet(chain: Chain): Promise<void>`
  - Disconnect from a specific chain

- `getConnectedWallets(): WalletConnection[]`
  - Get all currently connected wallets

- `getAllAccountsForChain(chain: Chain): Promise<Account[]>`
  - Get all accounts for a specific chain

- `switchAccountForChain(chain: Chain, address: string): Promise<void>`
  - Switch to a different account on a chain

- `connectAllEVMChains(source?: IntegrationSource): Promise<{ connections: WalletConnection[] }>`
  - Connect to all EVM chains at once

- `isWalletConnected(chain: Chain): boolean`
  - Check if a wallet is connected for a specific chain

- `getWalletAddress(chain: Chain): string | null`
  - Get the connected address for a specific chain

- `getAllWallets(): WalletInstance[]`
  - Get all wallet instances

- `addWallet(name?: string): Promise<WalletInstance>`
  - Add a new wallet instance

- `removeWallet(walletId: string): Promise<void>`
  - Remove a wallet instance

- `switchWallet(walletId: string): Promise<void>`
  - Switch to a different wallet instance

### Types

```typescript
interface WalletConnection {
  address: string;
  chain: Chain;
  source: IntegrationSource;
  connected: boolean;
  connectedAt?: Date;
  accounts?: Account[];
  activeAccount?: Account;
}

interface Account {
  address: string;
  index: number;
  derivationPath?: string;
  label?: string;
}

interface WalletInstance {
  id: string;
  name?: string;
  accounts: Account[];
  activeAccountIndex: number;
  source: IntegrationSource;
}
```

## Data Model Integration

This library uses `@cygnus-wealth/data-models` for standardized data structures:

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

## Architecture

This library is designed to be a read-only wallet integration system, focusing solely on:
- Connecting to wallets
- Retrieving wallet addresses
- Managing multiple accounts
- Switching between networks

The library does NOT handle:
- Balance fetching (this should be done through separate blockchain data providers)
- Transaction signing
- Private key management
- Token transfers

This separation of concerns ensures the library remains focused, secure, and maintainable.