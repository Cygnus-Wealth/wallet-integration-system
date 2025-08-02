/**
 * Mock wallet test that doesn't require actual MetaMask extension
 * This is more reliable for CI/CD and automated testing
 */

import { WalletManager } from '../../services/WalletManager';
import { Chain, IntegrationSource } from '@cygnus-wealth/data-models';

// Mock window.ethereum
global.window = {
  ethereum: {
    isMetaMask: true,
    selectedAddress: null,
    chainId: '0x1',
    
    request: async ({ method, params }: any) => {
      console.log(`Mock ethereum.request called:`, method, params);
      
      switch (method) {
        case 'eth_requestAccounts':
          global.window.ethereum.selectedAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
          return ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'];
          
        case 'eth_accounts':
          return global.window.ethereum.selectedAddress 
            ? [global.window.ethereum.selectedAddress]
            : [];
          
        case 'eth_chainId':
          return global.window.ethereum.chainId;
          
        case 'wallet_switchEthereumChain':
          if (params[0]?.chainId) {
            global.window.ethereum.chainId = params[0].chainId;
          }
          return null;
          
        case 'wallet_addEthereumChain':
          return null;
          
        case 'eth_getBalance':
          return '0x1000000000000000000'; // 1 ETH
          
        case 'eth_call':
          // Mock ERC20 balance call
          return '0x0000000000000000000000000000000000000000000000000000000000000000';
          
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    },
    
    on: (event: string, handler: Function) => {
      console.log(`Mock ethereum.on called:`, event);
    },
    
    removeListener: (event: string, handler: Function) => {
      console.log(`Mock ethereum.removeListener called:`, event);
    }
  }
} as any;

async function runMockWalletTest() {
  console.log('🚀 Starting mock wallet test...');
  
  try {
    const walletManager = new WalletManager();
    
    // Test 1: Connect to Ethereum
    console.log('\n📋 Test 1: Connect to Ethereum');
    const ethConnection = await walletManager.connectWallet(
      Chain.ETHEREUM,
      IntegrationSource.METAMASK
    );
    console.log('✅ Connected:', ethConnection);
    
    // Test 2: Get balances
    console.log('\n📋 Test 2: Get balances');
    const balances = await walletManager.getBalancesByChain(Chain.ETHEREUM);
    console.log('✅ Balances:', balances);
    
    // Test 3: Connect to multiple chains
    console.log('\n📋 Test 3: Connect to multiple EVM chains');
    const multiChainResult = await walletManager.connectAllEVMChains();
    console.log('✅ Connected to', multiChainResult.connections.length, 'chains');
    console.log('✅ Total balances:', multiChainResult.balances.length);
    
    // Test 4: Get all chain balances
    console.log('\n📋 Test 4: Get all chain balances');
    const allBalances = await walletManager.getAllChainBalances();
    console.log('✅ Balances by chain:');
    for (const [chain, chainBalances] of Object.entries(allBalances)) {
      console.log(`  - ${chain}: ${chainBalances.length} assets`);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runMockWalletTest();