import axios from 'axios';
import { Chain, Price } from '@cygnus-wealth/data-models';

interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

interface TokenPriceCache {
  price: number;
  timestamp: number;
}

export class TokenPriceService {
  private static instance: TokenPriceService;
  private priceCache: Map<string, TokenPriceCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

  private constructor() {}

  static getInstance(): TokenPriceService {
    if (!TokenPriceService.instance) {
      TokenPriceService.instance = new TokenPriceService();
    }
    return TokenPriceService.instance;
  }

  async getTokenPrice(
    tokenAddress: string, 
    chain: Chain,
    coingeckoId?: string
  ): Promise<Price | null> {
    const cacheKey = `${chain}-${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return {
        amount: cached.price,
        value: cached.price,
        currency: 'USD',
        timestamp: new Date(cached.timestamp)
      } as Price;
    }

    try {
      let price: number | null = null;

      if (coingeckoId) {
        price = await this.fetchPriceByCoingeckoId(coingeckoId);
      } else {
        price = await this.fetchPriceByAddress(tokenAddress, chain);
      }

      if (price !== null) {
        this.priceCache.set(cacheKey, {
          price,
          timestamp: Date.now()
        });

        return {
          amount: price,
          value: price,
          currency: 'USD',
          timestamp: new Date()
        } as Price;
      }
    } catch (error) {
      console.error('Error fetching token price:', error);
    }

    return null;
  }

  async getMultipleTokenPrices(
    tokens: Array<{ address: string; chain: Chain; coingeckoId?: string }>
  ): Promise<Map<string, Price>> {
    const prices = new Map<string, Price>();
    
    const coingeckoIds = tokens
      .filter(t => t.coingeckoId)
      .map(t => t.coingeckoId!);

    if (coingeckoIds.length > 0) {
      const cgPrices = await this.fetchMultiplePricesByCoingeckoId(coingeckoIds);
      
      for (const token of tokens) {
        if (token.coingeckoId && cgPrices[token.coingeckoId]) {
          const price: Price = {
            amount: cgPrices[token.coingeckoId].usd,
            value: cgPrices[token.coingeckoId].usd,
            currency: 'USD',
            timestamp: new Date()
          } as Price;
          
          prices.set(`${token.chain}-${token.address}`, price);
          
          this.priceCache.set(`${token.chain}-${token.address}`, {
            price: price.amount || price.value || 0,
            timestamp: Date.now()
          });
        }
      }
    }

    for (const token of tokens) {
      const key = `${token.chain}-${token.address}`;
      if (!prices.has(key)) {
        const price = await this.getTokenPrice(token.address, token.chain, token.coingeckoId);
        if (price) {
          prices.set(key, price);
        }
      }
    }

    return prices;
  }

  private async fetchPriceByCoingeckoId(coingeckoId: string): Promise<number | null> {
    try {
      const response = await axios.get<CoinGeckoPrice>(
        `${this.COINGECKO_API_URL}/simple/price`,
        {
          params: {
            ids: coingeckoId,
            vs_currencies: 'usd'
          }
        }
      );

      return response.data[coingeckoId]?.usd || null;
    } catch (error) {
      console.error('Error fetching price from CoinGecko:', error);
      return null;
    }
  }

  private async fetchMultiplePricesByCoingeckoId(
    coingeckoIds: string[]
  ): Promise<CoinGeckoPrice> {
    try {
      const response = await axios.get<CoinGeckoPrice>(
        `${this.COINGECKO_API_URL}/simple/price`,
        {
          params: {
            ids: coingeckoIds.join(','),
            vs_currencies: 'usd'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching multiple prices from CoinGecko:', error);
      return {};
    }
  }

  private async fetchPriceByAddress(
    address: string, 
    chain: Chain
  ): Promise<number | null> {
    const platformId = this.getCoingeckoPlatformId(chain);
    
    if (!platformId) {
      return null;
    }

    try {
      const response = await axios.get<CoinGeckoPrice>(
        `${this.COINGECKO_API_URL}/simple/token_price/${platformId}`,
        {
          params: {
            contract_addresses: address,
            vs_currencies: 'usd'
          }
        }
      );

      return response.data[address.toLowerCase()]?.usd || null;
    } catch (error) {
      console.error('Error fetching token price by address:', error);
      return null;
    }
  }

  private getCoingeckoPlatformId(chain: Chain): string | null {
    const platformMap: Partial<Record<Chain, string>> = {
      [Chain.ETHEREUM]: 'ethereum',
      [Chain.BSC]: 'binance-smart-chain',
      [Chain.POLYGON]: 'polygon-pos',
      [Chain.ARBITRUM]: 'arbitrum-one',
      [Chain.OPTIMISM]: 'optimistic-ethereum',
      [Chain.AVALANCHE]: 'avalanche',
      [Chain.BASE]: 'base',
      [Chain.SOLANA]: 'solana',
      [Chain.SUI]: 'sui'
    };

    return platformMap[chain] || null;
  }

  clearCache(): void {
    this.priceCache.clear();
  }

  getCacheSize(): number {
    return this.priceCache.size;
  }
}