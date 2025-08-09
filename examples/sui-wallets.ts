import { 
  WalletManager, 
  Chain, 
  IntegrationSource 
} from '../src';

async function connectToSuiWallets() {
  const walletManager = new WalletManager();

  console.log('Sui Wallet Connection Examples\n');

  // Example 1: Connect to Suiet wallet (if installed)
  try {
    console.log('Attempting to connect to Suiet wallet...');
    const suietConnection = await walletManager.connectWallet(
      Chain.SUI, 
      IntegrationSource.SUIET
    );
    console.log('✓ Connected to Suiet:', suietConnection.address);
  } catch (error) {
    console.log('✗ Suiet not available:', error.message);
  }

  // Example 2: Connect to any available Sui wallet (Slush, Suiet, etc.)
  try {
    console.log('\nAttempting to connect to any Sui wallet (including Slush)...');
    const suiConnection = await walletManager.connectWallet(
      Chain.SUI, 
      IntegrationSource.OTHER // Will try Wallet Standard first (Slush), then fall back to Suiet
    );
    console.log('✓ Connected to Sui wallet:', suiConnection.address);
    console.log('  Wallet source:', suiConnection.source);
    
    // Get balances
    const balances = await walletManager.getBalancesByChain(Chain.SUI);
    console.log(`\nFound ${balances.length} tokens:`);
    
    for (const balance of balances) {
      console.log(`  ${balance.asset.symbol}: ${balance.amount}`);
    }
  } catch (error) {
    console.log('✗ No Sui wallet available:', error.message);
  }
}

// Note about Slush wallet
console.log(`
Note: Slush wallet (formerly Sui Wallet) is the official wallet by Mysten Labs.
It uses the Wallet Standard for integration, which this library fully supports.

If you have Slush installed, it will be automatically detected when using:
- IntegrationSource.OTHER (recommended for Slush)
- Or when Suiet is not available

The library supports both:
1. Legacy window injection (Suiet via window.suiet)
2. Modern Wallet Standard (Slush and other compliant wallets)
`);

// Run the example
if (require.main === module) {
  connectToSuiWallets().catch(console.error);
}