import { Asset, AssetType, Chain } from '@cygnus-wealth/data-models';
import { WalletBalance, TokenInfo } from '../types';
import { NATIVE_TOKEN_ADDRESS } from './constants';

export function createAssetFromToken(token: TokenInfo): Asset {
  return {
    id: `${token.chain}-${token.address}`,
    symbol: token.symbol,
    name: token.name,
    type: AssetType.CRYPTOCURRENCY,
    chain: token.chain,
    contractAddress: token.address === NATIVE_TOKEN_ADDRESS ? undefined : token.address,
    decimals: token.decimals,
    metadata: {
      logoURI: token.logoURI,
      coingeckoId: token.coingeckoId
    }
  };
}

export function createWalletBalance(
  asset: Asset,
  amount: string,
  walletAddress: string,
  chain: Chain,
  value?: number
): WalletBalance {
  const balance: WalletBalance = {
    assetId: asset.id!,
    asset,
    amount,
    walletAddress,
    chain,
    lastUpdated: new Date()
  };

  if (value !== undefined) {
    balance.value = {
      value: value,
      currency: 'USD',
      timestamp: new Date(),
      source: 'COINGECKO' as any
    };
  }

  return balance;
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalString.replace(/0+$/, '');
  
  return `${integerPart}.${trimmedFractional}`;
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const combinedString = integerPart + paddedFractional;
  return BigInt(combinedString);
}

export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase() || 
         address === '0x0000000000000000000000000000000000000000';
}