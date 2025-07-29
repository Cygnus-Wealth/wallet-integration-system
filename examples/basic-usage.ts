import { 
  WalletManager, 
  PortfolioCalculator,
  Chain, 
  IntegrationSource 
} from '../src';

async function main() {
  const walletManager = new WalletManager();
  const calculator = new PortfolioCalculator();

  try {
    // Connect to Ethereum wallet
    console.log('Connecting to MetaMask...');
    const ethConnection = await walletManager.connectWallet(
      Chain.ETHEREUM, 
      IntegrationSource.METAMASK
    );
    console.log('Connected to Ethereum:', ethConnection.address);

    // Connect to Solana wallet
    console.log('Connecting to Phantom...');
    const solConnection = await walletManager.connectWallet(
      Chain.SOLANA, 
      IntegrationSource.PHANTOM
    );
    console.log('Connected to Solana:', solConnection.address);

    // Get all balances
    console.log('\nFetching balances...');
    const balances = await walletManager.getAllBalances();
    console.log(`Found ${balances.length} token balances`);

    // Calculate portfolio value
    console.log('\nCalculating portfolio value...');
    const portfolio = await calculator.calculatePortfolioValue(balances);
    console.log(`Total Portfolio Value: $${portfolio.totalValue.amount.toFixed(2)}`);

    // Show chain breakdown
    const chainBreakdown = calculator.calculateChainBreakdown(portfolio);
    console.log('\nChain Breakdown:');
    for (const [chain, info] of chainBreakdown) {
      console.log(`  ${chain}: $${info.value.toFixed(2)} (${info.percentage.toFixed(2)}%)`);
    }

    // Show top assets
    const topAssets = calculator.getTopAssets(portfolio, 5);
    console.log('\nTop 5 Assets:');
    for (const asset of topAssets) {
      console.log(`  ${asset.asset.symbol}: $${asset.value.amount.toFixed(2)}`);
    }

    // Disconnect wallets
    console.log('\nDisconnecting wallets...');
    await walletManager.disconnectAll();
    console.log('Disconnected all wallets');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main();
}