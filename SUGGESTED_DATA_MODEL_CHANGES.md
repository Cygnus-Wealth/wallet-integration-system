# Suggested Changes to @cygnus-wealth/data-models

The wallet-integration-system requires the following changes to the data-models library:

## 1. Add BASE chain to Chain enum

In `src/enums/Chain.ts`, add:
```typescript
export enum Chain {
  // ... existing chains
  BASE = 'BASE',
  // ... rest
}
```

## 2. Update IntegrationSource enum

In `src/enums/IntegrationSource.ts`, ensure SUIET is included:
```typescript
export enum IntegrationSource {
  // ... existing sources
  SUIET = 'SUIET',
  // ... rest
}
```

## 3. Update Price interface

The Price interface needs to support a simpler structure. In `src/interfaces/Price.ts`:
```typescript
export interface Price {
  value?: number; // For backward compatibility
  amount?: number; // New field
  currency: string;
  timestamp: Date;
  source?: IntegrationSource; // Make optional
}
```

## 4. Create a new PortfolioAsset interface

Create `src/interfaces/PortfolioAsset.ts`:
```typescript
import { Asset } from './Asset';
import { Balance } from './Balance';
import { Price } from './Price';

export interface PortfolioAsset {
  id: string;
  accountId: string;
  assetId: string;
  asset: Asset;
  balance: Balance;
  value: Price;
  allocation: number;
  lastUpdated: Date;
}
```

## 5. Update Portfolio interface

In `src/interfaces/Portfolio.ts`, add support for items:
```typescript
import { Account } from './Account';
import { Price } from './Price';
import { PortfolioAsset } from './PortfolioAsset';
import { Metadata } from './Metadata';

export interface Portfolio {
  id: string;
  userId?: string; // Make optional for wallet-only portfolios
  name: string;
  accounts?: Account[]; // Make optional
  items?: PortfolioAsset[]; // New field for detailed assets
  totalValue: Price;
  totalValueHistory?: Array<{
    timestamp: Date;
    value: Price;
  }>;
  performance?: {
    day: number;
    week: number;
    month: number;
    year: number;
    all_time: number;
  };
  lastUpdated: Date;
  metadata?: Metadata; // Add metadata support
}
```

## 6. Export new interfaces

In `src/index.ts`, add:
```typescript
export { PortfolioAsset } from './interfaces/PortfolioAsset';
```

These changes will maintain backward compatibility while supporting the wallet integration system's needs.