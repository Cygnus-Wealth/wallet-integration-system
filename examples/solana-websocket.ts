import { SolanaWalletIntegration } from '../src/chains/solana/SolanaWalletIntegration';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';

async function demonstrateWebSocketFeatures() {
  console.log('=== Solana WebSocket Integration Demo ===\n');

  // Create integration with custom RPC endpoint (optional)
  const wallet = new SolanaWalletIntegration(
    Chain.SOLANA,
    IntegrationSource.PHANTOM,
    {
      // Optional: provide custom RPC endpoint
      // rpcUrl: 'https://your-custom-rpc.com'
    }
  );

  // Check connection status
  const status = wallet.getConnectionStatus();
  console.log('Connection Status:', {
    type: status.isWebSocket ? 'WebSocket' : 'HTTP',
    connected: status.isConnected,
    endpoint: status.rpcEndpoint,
    reconnectAttempts: status.reconnectAttempts
  });

  try {
    // Connect wallet
    console.log('\nConnecting to Phantom wallet...');
    const connection = await wallet.connect();
    console.log('Connected to:', connection.address);

    // Subscribe to real-time balance updates
    console.log('\nSubscribing to balance updates...');
    const unsubscribe = await wallet.subscribeToBalances(
      connection.address,
      (balances) => {
        console.log('\n📊 Balance Update Received:');
        balances.forEach(balance => {
          console.log(`  ${balance.asset.symbol}: ${balance.amount}`);
        });
      }
    );

    console.log('✅ Subscribed to real-time updates');
    console.log('Balance updates will be logged as they occur...');

    // Get initial balances
    const balances = await wallet.getBalances();
    console.log('\nInitial Balances:');
    balances.forEach(balance => {
      console.log(`  ${balance.asset.symbol}: ${balance.amount}`);
    });

    // Monitor connection status
    setInterval(() => {
      const currentStatus = wallet.getConnectionStatus();
      console.log(`\n[Status] ${currentStatus.isWebSocket ? 'WebSocket' : 'HTTP'} - ${currentStatus.rpcEndpoint}`);
    }, 30000);

    // Manual reconnection example (if needed)
    // await wallet.reconnect();

    // Keep the script running to receive updates
    console.log('\nListening for balance changes... (Press Ctrl+C to exit)');
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\n\nCleaning up...');
      unsubscribe();
      await wallet.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    await wallet.disconnect();
  }
}

// Note about WebSocket fallback behavior:
console.log(`
WebSocket Connection Features:
- Attempts WebSocket connection by default
- Automatically tries multiple RPC endpoints
- Falls back to HTTP polling (1 min intervals) if WebSocket fails
- Exponential backoff for reconnection attempts
- Automatic reconnection on connection loss
- Real-time balance updates when using WebSocket
`);

demonstrateWebSocketFeatures();