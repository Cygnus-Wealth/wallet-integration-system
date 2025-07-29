export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

export const MULTICALL_ABI = [
  'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)',
  'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)'
];

export const MULTICALL_ADDRESSES: Record<number, string> = {
  1: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441', // Ethereum
  56: '0x41263cBA59EB80dC200F3E2544eda4ed6A90E76C', // BSC
  137: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507', // Polygon
  42161: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2', // Arbitrum
  10: '0x35A6Cdb2C9AD4a45112df4a04147EB07dFA01aB7', // Optimism
  43114: '0x8755b94F88D120AB2Cc13b1f6582329b067C760d', // Avalanche
  8453: '0xcA11bde05977b3631167028862bE2a173976CA11' // Base
};