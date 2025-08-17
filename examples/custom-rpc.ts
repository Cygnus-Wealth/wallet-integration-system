import { 
  WalletManager, 
  Chain, 
  IntegrationSource,
  WalletIntegrationConfig 
} from '../src';

async function main() {
  // Example: Using custom configuration
  const customConfig: WalletIntegrationConfig = {
    rpcUrl: 'https://rpc.ankr.com/solana' // Example: using Ankr's Solana RPC (not used for wallet connections)
  };
  
  const walletManager = new WalletManager(customConfig);

  try {
    // Connect to Solana wallet
    console.log('Connecting to Phantom wallet...');
    const solConnection = await walletManager.connectWallet(
      Chain.SOLANA, 
      IntegrationSource.PHANTOM
    );
    console.log('Connected to Solana:', solConnection.address);
    console.log('Connected accounts:', solConnection.accounts);

    // Get all accounts
    const accounts = await walletManager.getAllAccountsForChain(Chain.SOLANA);
    console.log(`Found ${accounts.length} Solana accounts:`, accounts);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Connect to multiple chains
async function multiChainExample() {
  const walletManager = new WalletManager();

  try {
    // Connect to EVM wallet (MetaMask)
    console.log('Connecting to MetaMask...');
    const ethConnection = await walletManager.connectWallet(
      Chain.ETHEREUM, 
      IntegrationSource.METAMASK
    );
    console.log('Connected to Ethereum:', ethConnection.address);

    // Connect to other EVM chains with same wallet
    const polygonConnection = await walletManager.connectWallet(
      Chain.POLYGON,
      IntegrationSource.METAMASK
    );
    console.log('Connected to Polygon:', polygonConnection.address);

    // Get all connected wallets
    const connectedWallets = walletManager.getConnectedWallets();
    console.log('\nAll connected wallets:');
    connectedWallets.forEach(wallet => {
      console.log(`  ${wallet.chain}: ${wallet.address}`);
    });

    // Get wallet address for specific chain
    const ethAddress = walletManager.getWalletAddress(Chain.ETHEREUM);
    console.log('\nEthereum address:', ethAddress);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Multi-account support
async function multiAccountExample() {
  const walletManager = new WalletManager();

  try {
    // Connect wallet
    const connection = await walletManager.connectWallet(
      Chain.ETHEREUM,
      IntegrationSource.METAMASK
    );
    console.log('Connected to wallet');

    // Get all accounts for the chain
    const accounts = await walletManager.getAllAccountsForChain(Chain.ETHEREUM);
    console.log(`Found ${accounts.length} accounts:`);
    accounts.forEach(account => {
      console.log(`  Account ${account.index}: ${account.address}`);
      if (account.label) console.log(`    Label: ${account.label}`);
    });

    // Switch to a different account (if multiple exist)
    if (accounts.length > 1) {
      console.log(`\nSwitching to account ${accounts[1].address}...`);
      await walletManager.switchAccountForChain(Chain.ETHEREUM, accounts[1].address);
      
      const newAddress = walletManager.getWalletAddress(Chain.ETHEREUM);
      console.log('Now using address:', newAddress);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Connect all EVM chains at once
async function connectAllEVMExample() {
  const walletManager = new WalletManager();

  try {
    console.log('Connecting to all EVM chains...');
    const { connections } = await walletManager.connectAllEVMChains(IntegrationSource.METAMASK);
    
    console.log(`\nConnected to ${connections.length} EVM chains:`);
    connections.forEach(conn => {
      console.log(`  ${conn.chain}: ${conn.address}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main()
    .then(() => multiChainExample())
    .then(() => multiAccountExample())
    .then(() => connectAllEVMExample())
    .catch(console.error);
}