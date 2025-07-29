import { Chain, AssetType, Portfolio, PortfolioAsset, Price } from '@cygnus-wealth/data-models';
import { WalletBalance } from '../types';
import { TokenPriceService } from './TokenPriceService';

export class PortfolioCalculator {
  private priceService: TokenPriceService;

  constructor() {
    this.priceService = TokenPriceService.getInstance();
  }

  async calculatePortfolioValue(
    balances: WalletBalance[]
  ): Promise<Portfolio> {
    const portfolioItems: PortfolioAsset[] = [];
    let totalValue = 0;
    
    const tokenPriceRequests = balances.map(balance => ({
      address: balance.asset.contractAddress || balance.asset.symbol!,
      chain: balance.chain,
      coingeckoId: balance.asset.metadata?.coingeckoId as string | undefined
    }));

    const prices = await this.priceService.getMultipleTokenPrices(tokenPriceRequests);

    for (const balance of balances) {
      const priceKey = `${balance.chain}-${balance.asset.contractAddress || balance.asset.symbol}`;
      const price = prices.get(priceKey);
      
      let value = 0;
      if (price) {
        value = parseFloat(balance.amount) * (price.amount || price.value || 0);
        balance.value = price;
      }

      const portfolioItem: PortfolioAsset = {
        id: `${balance.walletAddress}-${balance.assetId}`,
        accountId: balance.walletAddress,
        assetId: balance.assetId,
        asset: balance.asset,
        balance: balance,
        value: {
          amount: value,
          currency: 'USD',
          timestamp: new Date()
        } as Price,
        allocation: 0, // Will be calculated after total
        lastUpdated: balance.lastUpdated
      };

      portfolioItems.push(portfolioItem);
      totalValue += value;
    }

    // Calculate allocations
    for (const item of portfolioItems) {
      item.allocation = totalValue > 0 ? ((item.value as any).amount / totalValue) * 100 : 0;
    }

    const portfolio: Portfolio = {
      id: 'wallet-portfolio',
      name: 'Wallet Portfolio',
      items: portfolioItems,
      totalValue: {
        amount: totalValue,
        currency: 'USD',
        timestamp: new Date()
      } as Price,
      lastUpdated: new Date(),
      metadata: {
        balanceCount: balances.length,
        chains: Array.from(new Set(balances.map(b => b.chain)))
      }
    };

    return portfolio;
  }

  calculateChainBreakdown(
    portfolio: Portfolio
  ): Map<Chain, { value: number; percentage: number }> {
    const chainValues = new Map<Chain, number>();
    
    for (const item of portfolio.items || []) {
      const chain = (item.balance as any)?.chain || item.asset.chain;
      if (chain) {
        const currentValue = chainValues.get(chain) || 0;
        chainValues.set(chain, currentValue + ((item.value as any).amount || 0));
      }
    }

    const breakdown = new Map<Chain, { value: number; percentage: number }>();
    const totalValue = (portfolio.totalValue as any).amount || 0;

    for (const [chain, value] of chainValues) {
      breakdown.set(chain, {
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      });
    }

    return breakdown;
  }

  calculateAssetTypeBreakdown(
    portfolio: Portfolio
  ): Map<AssetType, { value: number; percentage: number }> {
    const typeValues = new Map<AssetType, number>();
    
    for (const item of portfolio.items || []) {
      const type = item.asset.type;
      const currentValue = typeValues.get(type) || 0;
      typeValues.set(type, currentValue + ((item.value as any).amount || 0));
    }

    const breakdown = new Map<AssetType, { value: number; percentage: number }>();
    const totalValue = (portfolio.totalValue as any).amount || 0;

    for (const [type, value] of typeValues) {
      breakdown.set(type, {
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      });
    }

    return breakdown;
  }

  getTopAssets(portfolio: Portfolio, limit: number = 10): PortfolioAsset[] {
    return [...(portfolio.items || [])]
      .sort((a, b) => ((b.value as any).amount || 0) - ((a.value as any).amount || 0))
      .slice(0, limit);
  }

  filterByChain(portfolio: Portfolio, chain: Chain): Portfolio {
    const filteredItems = (portfolio.items || []).filter(
      item => ((item.balance as any)?.chain || item.asset.chain) === chain
    );

    const totalValue = filteredItems.reduce(
      (sum, item) => sum + ((item.value as any).amount || 0), 
      0
    );

    return {
      ...portfolio,
      items: filteredItems,
      totalValue: {
        amount: totalValue,
        currency: 'USD',
        timestamp: new Date()
      }
    };
  }
}