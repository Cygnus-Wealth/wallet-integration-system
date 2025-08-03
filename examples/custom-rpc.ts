import { 
  WalletManager, 
  Chain, 
  IntegrationSource,
  WalletIntegrationConfig 
} from '../src';

async function main() {
  // Example 1: Using custom RPC URLs
  const customConfig: WalletIntegrationConfig = {
    rpcUrl: 'https://rpc.ankr.com/solana' // Example: using Ankr's Solana RPC
  };
  
  const walletManager = new WalletManager(customConfig);

  try {
    // Connect to Solana with custom RPC
    console.log('Connecting to Phantom with custom RPC...');
    const solConnection = await walletManager.connectWallet(
      Chain.SOLANA, 
      IntegrationSource.PHANTOM
    );
    console.log('Connected to Solana:', solConnection.address);

    // Get balances using custom RPC
    const balances = await walletManager.getBalancesByChain(Chain.SOLANA);
    console.log(`Found ${balances.length} Solana token balances`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Different RPC providers
async function showRPCProviders() {
  // Popular Solana RPC providers (you'll need your own API keys)
  const rpcProviders = {
    // Free public RPC (default)
    public: 'https://api.mainnet-beta.solana.com',
    
    // Ankr (free tier available)
    ankr: 'https://rpc.ankr.com/solana',
    
    // Helius (requires API key)
    helius: 'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
    
    // QuickNode (requires endpoint)
    quicknode: 'https://YOUR-ENDPOINT.solana-mainnet.quiknode.pro/YOUR-KEY/',
    
    // Alchemy (requires API key)
    alchemy: 'https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
  };

  console.log('Available Solana RPC providers:');
  for (const [name, url] of Object.entries(rpcProviders)) {
    console.log(`  ${name}: ${url}`);
  }
}

// Run the example
if (require.main === module) {
  main().then(() => showRPCProviders());
}