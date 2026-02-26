# System Architecture: EIP-6963 Discovery API Changes

**Bead**: wa-qspzs
**Domain Arch**: DOMAIN_ARCH_EIP6963_DISCOVERY.md (wa-uug)
**Enterprise Directive**: en-7hfo
**Date**: 2026-02-26
**Scope**: Internal module-level implementation for WIS EIP-6963 discovery API changes

---

## 1. Module Decomposition

### 1.1 Affected Modules

| Module | File | Role | Change Scope |
|--------|------|------|--------------|
| Discovery Types | `src/discovery/types.ts` | Type definitions for discovery domain | Add `EIP6963ProviderInfo`, `DiscoverySource`, extend `DiscoveredWallet` and `DiscoveredProvider` |
| EIP-6963 Protocol | `src/discovery/Eip6963Discovery.ts` | EIP-6963 event listener and provider collection | Set `discoverySource` on produced providers |
| Wallet Standard Protocol | `src/discovery/WalletStandardDiscovery.ts` | Wallet Standard protocol handler | Set `discoverySource` on produced providers |
| Global Injection Protocol | `src/discovery/GlobalInjectionDiscovery.ts` | Legacy `window.*` fallback detection | Set `discoverySource`, replace `isFallback` usage |
| Correlation Service | `src/discovery/ProviderCorrelationService.ts` | Correlates multi-protocol providers into wallets | Aggregate `discoverySources`, build `providerInfo`, validate EIP-6963 fields |
| Discovery Facade | `src/discovery/WalletDiscoveryService.ts` | Public-facing discovery orchestrator | Add events, methods, late-arrival wiring, `isDiscoverySettled()`, `refreshDiscovery()` |
| Public Exports | `src/index.ts` | Barrel export for package consumers | Export new types, add deprecation annotations |

### 1.2 Unaffected Modules

| Module | Reason |
|--------|--------|
| `src/discovery/correlation-registry.ts` | No changes needed — lookup functions and correlation data are unchanged |
| `src/services/WalletConnectionService.ts` | Connection lifecycle is post-discovery; unchanged per en-fr0z/en-o8w |
| `src/services/WalletManager.ts` | Facade over connection services; not involved in discovery |
| `src/utils/TypedEventEmitter.ts` | Already supports the event patterns needed; no changes |

### 1.3 New Module

| Module | File | Role |
|--------|------|------|
| Validation Utilities | `src/discovery/validation.ts` | Sanitize and validate EIP-6963 provider info fields (icon data URI, rdns format, uuid format, name length) |

---

## 2. Class/Interface Changes Per File

### 2.1 `src/discovery/types.ts`

#### New Type: `DiscoverySource`

```typescript
export type DiscoverySource = 'eip6963' | 'wallet-standard' | 'legacy-injection' | 'walletconnect';
```

Purpose: Explicit union type replacing the boolean `isFallback` field. Each discovery protocol sets its own source value.

#### New Type: `EIP6963ProviderInfo`

```typescript
export interface EIP6963ProviderInfo {
  name: string;      // Human-readable wallet name, truncated to MAX_NAME_LENGTH
  icon: string;      // Validated data URI (SVG or PNG)
  rdns: string;      // Reverse DNS identifier, validated format
  uuid: string;      // UUID v4 format, validated
}
```

Purpose: Structured branding metadata from EIP-6963 announcements that crosses the Integration → Experience boundary. This is distinct from the existing `WalletProviderInfo` in `multi-wallet.ts` which serves the provider catalog purpose.

#### Modified Interface: `DiscoveredProvider`

```typescript
export interface DiscoveredProvider {
  chainFamily: ChainFamily;
  name: string;
  icon: string;
  provider: unknown;
  rdns?: string;
  uuid?: string;
  discoverySource: DiscoverySource;   // NEW: replaces isFallback
  /** @deprecated Use discoverySource instead. Will be removed in next major version. */
  isFallback?: boolean;               // DEPRECATED: kept for backwards compat
}
```

Changes:
- ADD `discoverySource: DiscoverySource` — mandatory field set by each discovery protocol
- DEPRECATE `isFallback?: boolean` — kept for backwards compatibility, derived from `discoverySource === 'legacy-injection'`

#### Modified Interface: `DiscoveredWallet`

```typescript
export interface DiscoveredWallet {
  providerId: WalletProviderId | string;
  name: string;
  icon: string;
  supportedChainFamilies: ChainFamily[];
  isMultiChain: boolean;
  providerInfo: EIP6963ProviderInfo | null;   // NEW: EIP-6963 branding when available
  discoverySources: DiscoverySource[];         // NEW: all protocols that detected this wallet
  /** @deprecated Raw providers will be removed from public API. Use WalletDiscoveryService methods instead. */
  providers: Map<ChainFamily, DiscoveredProvider>;  // DEPRECATED
}
```

Changes:
- ADD `providerInfo: EIP6963ProviderInfo | null` — populated when any provider for this wallet came from EIP-6963; null otherwise
- ADD `discoverySources: DiscoverySource[]` — aggregated list of unique discovery sources across all correlated providers
- DEPRECATE `providers` — add `@deprecated` JSDoc annotation

#### New Event Type: `WalletDiscoveredEvent`

```typescript
export interface WalletDiscoveredEvent {
  wallet: DiscoveredWallet;
  timestamp: string;
}
```

#### New Event Type: `WalletRemovedEvent`

```typescript
export interface WalletRemovedEvent {
  providerId: WalletProviderId | string;
  timestamp: string;
}
```

#### Extended Union: `DiscoveryEvent`

```typescript
export type DiscoveryEvent =
  | { type: 'discoveryComplete'; payload: DiscoveryCompleteEvent }
  | { type: 'walletDiscovered'; payload: WalletDiscoveredEvent }
  | { type: 'walletRemoved'; payload: WalletRemovedEvent }
  | { type: 'chainFamilyConnectionChanged'; payload: ChainFamilyConnectionChangedEvent };
```

---

### 2.2 `src/discovery/validation.ts` (NEW FILE)

```typescript
export const MAX_PROVIDER_NAME_LENGTH = 64;
const DATA_URI_REGEX = /^data:image\/(svg\+xml|png|jpeg|gif|webp)(;base64)?,.+/;
const RDNS_REGEX = /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateDataUri(icon: string): boolean
export function validateRdns(rdns: string): boolean
export function validateUuid(uuid: string): boolean
export function sanitizeProviderName(name: string): string
export function validateAndBuildProviderInfo(raw: {
  name: string; icon: string; rdns: string; uuid: string;
}): EIP6963ProviderInfo | null
```

**`validateDataUri(icon)`**: Returns true if the icon string is a well-formed data URI with an image MIME type. Rejects non-data-URI values (http URLs, empty strings, etc.).

**`validateRdns(rdns)`**: Returns true if the rdns string matches reverse DNS format (e.g., `io.metamask`, `com.trustwallet.app`). Segments must start with a letter and contain only alphanumeric chars and hyphens.

**`validateUuid(uuid)`**: Returns true if the uuid string matches UUID format (8-4-4-4-12 hex digits, case-insensitive).

**`sanitizeProviderName(name)`**: Truncates to `MAX_PROVIDER_NAME_LENGTH` characters. Trims whitespace.

**`validateAndBuildProviderInfo(raw)`**: Orchestrator that validates all fields. If any mandatory field fails validation, returns `null` (wallet will have `providerInfo: null` even though it came from EIP-6963). Logs warnings for invalid fields. If icon fails validation but other fields are valid, the icon field is set to empty string (graceful degradation).

---

### 2.3 `src/discovery/Eip6963Discovery.ts`

#### Changes to `Eip6963Discovery` class

**Constructor/fields**: No new fields needed.

**`startDiscovery()` method change**: The `DiscoveredProvider` objects produced must include `discoverySource: 'eip6963'`.

Current construction (line 32-39):
```typescript
const discovered: DiscoveredProvider = {
  chainFamily: ChainFamily.EVM,
  rdns: info.rdns,
  name: info.name,
  icon: info.icon,
  uuid: info.uuid,
  provider,
};
```

New construction:
```typescript
const discovered: DiscoveredProvider = {
  chainFamily: ChainFamily.EVM,
  rdns: info.rdns,
  name: info.name,
  icon: info.icon,
  uuid: info.uuid,
  provider,
  discoverySource: 'eip6963',
};
```

No other changes to the class. The internal `Eip6963ProviderInfo` interface (lines 4-9) stays as-is — it's the raw EIP-6963 event shape, not our public type.

---

### 2.4 `src/discovery/WalletStandardDiscovery.ts`

#### Changes to `WalletStandardDiscovery` class

**`startDiscovery()` method change**: The `DiscoveredProvider` objects produced must include `discoverySource: 'wallet-standard'`.

Current construction (line 40-45):
```typescript
const discovered: DiscoveredProvider = {
  chainFamily: family,
  name: wallet.name,
  icon: wallet.icon,
  provider: wallet,
};
```

New construction:
```typescript
const discovered: DiscoveredProvider = {
  chainFamily: family,
  name: wallet.name,
  icon: wallet.icon,
  provider: wallet,
  discoverySource: 'wallet-standard',
};
```

---

### 2.5 `src/discovery/GlobalInjectionDiscovery.ts`

#### Changes to `GlobalInjectionDiscovery` class

**`detect()` method change**: All produced providers must include `discoverySource: 'legacy-injection'` and retain `isFallback: true` for backwards compatibility.

Current pattern (e.g., EVM fallback, lines 18-24):
```typescript
providers.push({
  chainFamily: ChainFamily.EVM,
  name,
  icon: '',
  provider: ethereum,
  isFallback: true,
});
```

New pattern:
```typescript
providers.push({
  chainFamily: ChainFamily.EVM,
  name,
  icon: '',
  provider: ethereum,
  discoverySource: 'legacy-injection',
  isFallback: true,  // @deprecated — kept for backwards compat
});
```

Applied to all three detection blocks (EVM, Solana, SUI).

---

### 2.6 `src/discovery/ProviderCorrelationService.ts`

#### Changes to `ProviderCorrelationService` class

**`correlate()` method changes**:

The internal `walletMap` accumulation structure adds two new fields:

```typescript
const walletMap = new Map<string, {
  providerId: WalletProviderId | string;
  name: string;
  icon: string;
  chainFamilies: Set<ChainFamily>;
  providers: Map<ChainFamily, DiscoveredProvider>;
  discoverySources: Set<DiscoverySource>;        // NEW
  eip6963Info: EIP6963ProviderInfo | null;         // NEW
}>();
```

**Discovery source aggregation**: For each provider in the loop, add `provider.discoverySource` to the entry's `discoverySources` set.

**EIP-6963 provider info extraction**: When processing a provider with `discoverySource === 'eip6963'` and the entry doesn't already have `eip6963Info`, call `validateAndBuildProviderInfo()` from `validation.ts` with the provider's `name`, `icon`, `rdns`, and `uuid` fields. Store the result as `eip6963Info`.

**Output mapping**: The return value adds new fields:

```typescript
return Array.from(walletMap.values()).map(entry => ({
  providerId: entry.providerId,
  name: entry.name,
  icon: entry.icon,
  supportedChainFamilies: Array.from(entry.chainFamilies),
  isMultiChain: entry.chainFamilies.size > 1,
  providers: entry.providers,
  providerInfo: entry.eip6963Info,                          // NEW
  discoverySources: Array.from(entry.discoverySources),     // NEW
}));
```

#### New Method: `correlateProvider()`

```typescript
correlateProvider(
  provider: DiscoveredProvider,
  existingWallets: DiscoveredWallet[]
): { wallet: DiscoveredWallet; isNew: boolean }
```

Purpose: Incremental correlation for a single late-arriving provider against the existing wallet list. Used by `WalletDiscoveryService` for late-arrival wiring.

Algorithm:
1. Look up correlation by rdns, then by name (same logic as `correlate()`)
2. Search `existingWallets` for a matching `providerId`
3. If found: update the existing wallet's `supportedChainFamilies`, `discoverySources`, `providerInfo`, and `providers` map. Return `{ wallet: updatedWallet, isNew: false }`
4. If not found: create a new `DiscoveredWallet` entry. Return `{ wallet: newWallet, isNew: true }`

This avoids re-correlating the entire provider list when a single new provider arrives.

---

### 2.7 `src/discovery/WalletDiscoveryService.ts`

#### Extended Event Map

```typescript
interface DiscoveryEvents {
  discoveryComplete: DiscoveryCompleteEvent;
  walletDiscovered: WalletDiscoveredEvent;    // NEW
  walletRemoved: WalletRemovedEvent;          // NEW
}
```

#### New Private Fields

```typescript
private discoverySettled = false;      // Tracks whether initial discovery window has elapsed
private lateArrivalWired = false;      // Guards against double-wiring late arrival callbacks
```

#### Modified Method: `startDiscovery()`

Changes to existing flow:

1. **Reset state**: At the start, set `this.discoverySettled = false` and clear previous wallets
2. **After timeout + correlation**: Set `this.discoverySettled = true`
3. **Wire late-arrival callbacks** (once, guarded by `lateArrivalWired`):
   - `this.eip6963.onProviderDiscovered(provider => this.handleLateArrival(provider))`
   - `this.walletStandard.onProviderDiscovered(provider => this.handleLateArrival(provider))`
4. Emit `discoveryComplete` event as before

Signature unchanged:
```typescript
async startDiscovery(options?: DiscoveryOptions): Promise<DiscoveredWallet[]>
```

#### New Private Method: `handleLateArrival()`

```typescript
private handleLateArrival(provider: DiscoveredProvider): void
```

Algorithm:
1. Guard: if `!this.discoverySettled`, return (provider is part of initial discovery, already captured)
2. Call `this.correlation.correlateProvider(provider, this.wallets)`
3. If `isNew === true`: push new wallet to `this.wallets`, emit `walletDiscovered` event
4. If `isNew === false`: update existing wallet in `this.wallets` array, emit `walletDiscovered` event (with updated wallet, so consumer can refresh UI)

#### New Method: `isDiscoverySettled()`

```typescript
isDiscoverySettled(): boolean
```

Returns `this.discoverySettled`. Synchronous query for whether the initial discovery window has elapsed. Consumers can use this to decide whether to show a "discovering wallets..." loading state.

#### New Method: `refreshDiscovery()`

```typescript
async refreshDiscovery(): Promise<DiscoveredWallet[]>
```

Algorithm:
1. Tear down current state:
   - Call `this.eip6963.destroy()` (removes event listeners, clears internal state)
   - Call `this.walletStandard.destroy()` (clears internal state)
   - Clear `this.wallets`
   - Set `this.discoverySettled = false`
   - Set `this.lateArrivalWired = false`
2. Re-create discovery instances:
   - `this.eip6963 = new Eip6963Discovery()`
   - `this.walletStandard = new WalletStandardDiscovery()`
   - `this.globalInjection = new GlobalInjectionDiscovery()`
3. Call `this.startDiscovery()` and return the result

This handles the "stale state cleanup" requirement from the domain arch.

#### New Method: `onWalletDiscovered()`

```typescript
onWalletDiscovered(handler: (event: WalletDiscoveredEvent) => void): () => void
```

Returns an unsubscribe function. Wraps `this.events.on('walletDiscovered', handler)`.

#### New Method: `onWalletRemoved()`

```typescript
onWalletRemoved(handler: (event: WalletRemovedEvent) => void): () => void
```

Returns an unsubscribe function. Wraps `this.events.on('walletRemoved', handler)`. Note: wallet removal detection is not implemented in Phase 1 (EIP-6963 doesn't define removal). The event subscription is wired for future use.

#### Modified Method: `destroy()`

Additional cleanup:
- Reset `this.discoverySettled = false`
- Reset `this.lateArrivalWired = false`

---

### 2.8 `src/index.ts`

#### New Type Exports

```typescript
export type {
  DiscoveredProvider,
  DiscoveredWallet,
  DiscoveryCompleteEvent,
  DiscoverySource,                    // NEW
  EIP6963ProviderInfo,                // NEW
  WalletDiscoveredEvent,              // NEW
  WalletRemovedEvent,                 // NEW
  ChainFamilyConnectionChangedEvent as DiscoveryChainFamilyConnectionChangedEvent,
} from './discovery/types';
```

#### Deprecation Annotations on Class Exports

```typescript
/** @internal Use WalletDiscoveryService instead. Individual discovery classes are WIS-internal. */
export { Eip6963Discovery } from './discovery/Eip6963Discovery';
/** @internal Use WalletDiscoveryService instead. Individual discovery classes are WIS-internal. */
export { WalletStandardDiscovery } from './discovery/WalletStandardDiscovery';
/** @internal Use WalletDiscoveryService instead. Individual discovery classes are WIS-internal. */
export { GlobalInjectionDiscovery } from './discovery/GlobalInjectionDiscovery';
```

#### New Validation Export

```typescript
export { validateDataUri, validateRdns, validateUuid } from './discovery/validation';
```

Exported for consumers that need to perform their own validation (e.g., CWA rendering icons).

---

## 3. Event Wiring

### 3.1 Late-Arrival Event Flow

```
[Wallet Extension installs/enables after initial discovery]
    │
    ▼ (browser dispatches eip6963:announceProvider)
Eip6963Discovery.announceHandler
    │
    ├── Deduplicates by uuid (seenUuids set)
    ├── Creates DiscoveredProvider with discoverySource: 'eip6963'
    ├── Stores in internal providers array
    ├── Calls registered callbacks
    │
    ▼
WalletDiscoveryService.handleLateArrival(provider)
    │
    ├── Guards: returns early if discoverySettled === false
    ├── Calls ProviderCorrelationService.correlateProvider(provider, this.wallets)
    │       │
    │       ├── Looks up correlation by rdns, then name
    │       ├── Searches existing wallets for matching providerId
    │       └── Returns { wallet, isNew }
    │
    ├── If isNew: pushes new wallet to this.wallets
    ├── If !isNew: replaces updated wallet in this.wallets
    │
    ▼
TypedEventEmitter.emit('walletDiscovered', { wallet, timestamp })
    │
    ▼
Consumer callback (CWA) receives WalletDiscoveredEvent
```

### 3.2 Wallet Standard Late-Arrival Flow

Same pattern as 3.1, but originating from `WalletStandardDiscovery.callbacks` instead of EIP-6963 events. The `WalletStandardDiscovery` class already has an `onProviderDiscovered` callback mechanism that works identically.

### 3.3 Discovery Lifecycle Event Sequence

```
startDiscovery() called
    │
    ├── [t=0]   eip6963.startDiscovery()
    ├── [t=0]   walletStandard.startDiscovery()
    ├── [t=0..timeout] providers announce via events
    │
    ├── [t=timeout] Collect all providers
    ├── [t=timeout] Detect global injection fallbacks
    ├── [t=timeout] ProviderCorrelationService.correlate(allProviders)
    ├── [t=timeout] discoverySettled = true
    ├── [t=timeout] Wire late-arrival callbacks
    │
    ├── EMIT: discoveryComplete { wallets, timestamp }
    │
    └── [t=timeout..∞] Late arrivals handled via handleLateArrival()
        │
        └── EMIT: walletDiscovered { wallet, timestamp } (for each late arrival)
```

### 3.4 Refresh Discovery Event Sequence

```
refreshDiscovery() called
    │
    ├── eip6963.destroy()
    ├── walletStandard.destroy()
    ├── wallets = []
    ├── discoverySettled = false
    ├── lateArrivalWired = false
    │
    ├── eip6963 = new Eip6963Discovery()
    ├── walletStandard = new WalletStandardDiscovery()
    ├── globalInjection = new GlobalInjectionDiscovery()
    │
    └── startDiscovery() → (same lifecycle as 3.3)
```

---

## 4. Data Flow Through Correlation Pipeline

### 4.1 Phase 1: Provider Collection

```
                    ┌─────────────────────┐
                    │  Eip6963Discovery    │
                    │  discoverySource:    │
                    │  'eip6963'           │──┐
                    └─────────────────────┘  │
                                              │
┌─────────────────────────┐                   │
│ WalletStandardDiscovery │                   │    ┌──────────────┐
│ discoverySource:        │───────────────────┼───▶│ allProviders │
│ 'wallet-standard'       │                   │    │ DiscoveredPr │
└─────────────────────────┘                   │    │ ovider[]     │
                                              │    └──────────────┘
┌─────────────────────────┐                   │
│ GlobalInjectionDiscovery│                   │
│ discoverySource:        │───────────────────┘
│ 'legacy-injection'      │
│ (only uncovered chains) │
└─────────────────────────┘
```

### 4.2 Phase 2: Correlation

```
allProviders: DiscoveredProvider[]
    │
    ▼
ProviderCorrelationService.correlate()
    │
    ├── For each provider:
    │     ├── Lookup correlation by rdns → getCorrelationByRdns()
    │     ├── Fallback: lookup by name → getCorrelationByName()
    │     ├── Determine wallet key (correlation.providerId or generated)
    │     │
    │     ├── Get or create walletMap entry
    │     │     ├── chainFamilies: Set<ChainFamily>
    │     │     ├── providers: Map<ChainFamily, DiscoveredProvider>
    │     │     ├── discoverySources: Set<DiscoverySource>     ← NEW
    │     │     └── eip6963Info: EIP6963ProviderInfo | null     ← NEW
    │     │
    │     ├── Add provider.chainFamily to chainFamilies
    │     ├── Set provider in providers map (first per chain wins)
    │     ├── Add provider.discoverySource to discoverySources  ← NEW
    │     │
    │     └── If discoverySource === 'eip6963' && !eip6963Info: ← NEW
    │           └── validateAndBuildProviderInfo({name, icon, rdns, uuid})
    │                 ├── validateDataUri(icon)
    │                 ├── validateRdns(rdns)
    │                 ├── validateUuid(uuid)
    │                 ├── sanitizeProviderName(name)
    │                 └── Store result as eip6963Info
    │
    ▼
DiscoveredWallet[] output:
    {
      providerId, name, icon,
      supportedChainFamilies,
      isMultiChain,
      providers,              // @deprecated
      providerInfo,           // NEW: from eip6963Info
      discoverySources,       // NEW: from discoverySources set
    }
```

### 4.3 Example: Phantom Multi-Protocol Discovery

```
Input providers:
  1. { chainFamily: EVM, rdns: 'app.phantom', name: 'Phantom', icon: 'data:image/svg...',
       uuid: 'abc-123', discoverySource: 'eip6963' }
  2. { chainFamily: SOLANA, name: 'Phantom', icon: 'https://phantom.app/icon.svg',
       discoverySource: 'wallet-standard' }

Correlation step:
  Provider 1: rdns 'app.phantom' → correlation { providerId: 'phantom' }
    → walletMap['phantom'] created
    → chainFamilies: { EVM }
    → discoverySources: { 'eip6963' }
    → eip6963Info: validateAndBuildProviderInfo({name: 'Phantom', icon: 'data:image/svg...', rdns: 'app.phantom', uuid: 'abc-123'})
       → { name: 'Phantom', icon: 'data:image/svg...', rdns: 'app.phantom', uuid: 'abc-123' }

  Provider 2: no rdns → name 'Phantom' → correlation { providerId: 'phantom' }
    → walletMap['phantom'] found (existing)
    → chainFamilies: { EVM, SOLANA }
    → discoverySources: { 'eip6963', 'wallet-standard' }
    → eip6963Info: already set, skip

Output:
  {
    providerId: 'phantom',
    name: 'Phantom',
    icon: 'data:image/svg...',
    supportedChainFamilies: ['EVM', 'SOLANA'],
    isMultiChain: true,
    providerInfo: { name: 'Phantom', icon: 'data:image/svg...', rdns: 'app.phantom', uuid: 'abc-123' },
    discoverySources: ['eip6963', 'wallet-standard'],
    providers: Map { EVM → provider1, SOLANA → provider2 }  // @deprecated
  }
```

### 4.4 Example: Legacy-Only Wallet

```
Input providers:
  1. { chainFamily: EVM, name: 'MetaMask (fallback)', icon: '',
       discoverySource: 'legacy-injection', isFallback: true }

Correlation step:
  Provider 1: no rdns → name 'MetaMask (fallback)' → name includes 'metamask' → correlation { providerId: 'metamask' }
    → walletMap['metamask'] created
    → chainFamilies: { EVM }
    → discoverySources: { 'legacy-injection' }
    → eip6963Info: null (discoverySource !== 'eip6963')

Output:
  {
    providerId: 'metamask',
    name: 'MetaMask',
    icon: '',
    supportedChainFamilies: ['EVM'],
    isMultiChain: false,
    providerInfo: null,
    discoverySources: ['legacy-injection'],
    providers: Map { EVM → provider1 }
  }
```

---

## 5. Implementation Phases

### Phase 1: Types + Fields + Validation + isDiscoverySettled()

**Files**: `types.ts`, `validation.ts` (new), `Eip6963Discovery.ts`, `WalletStandardDiscovery.ts`, `GlobalInjectionDiscovery.ts`, `ProviderCorrelationService.ts`, `WalletDiscoveryService.ts`, `index.ts`

1. Add `DiscoverySource` type to `types.ts`
2. Add `EIP6963ProviderInfo` interface to `types.ts`
3. Add `WalletDiscoveredEvent` and `WalletRemovedEvent` to `types.ts`
4. Extend `DiscoveredProvider` with `discoverySource` field, deprecate `isFallback`
5. Extend `DiscoveredWallet` with `providerInfo` and `discoverySources` fields, deprecate `providers`
6. Create `validation.ts` with all validation functions
7. Set `discoverySource: 'eip6963'` in `Eip6963Discovery.ts`
8. Set `discoverySource: 'wallet-standard'` in `WalletStandardDiscovery.ts`
9. Set `discoverySource: 'legacy-injection'` in `GlobalInjectionDiscovery.ts`
10. Update `ProviderCorrelationService.correlate()` to aggregate discoverySources and build providerInfo
11. Add `isDiscoverySettled()` to `WalletDiscoveryService.ts`
12. Update `src/index.ts` exports

### Phase 2: Events + Late-Arrival Wiring + refreshDiscovery()

**Files**: `ProviderCorrelationService.ts`, `WalletDiscoveryService.ts`

1. Add `correlateProvider()` method to `ProviderCorrelationService`
2. Wire late-arrival callbacks in `WalletDiscoveryService.startDiscovery()`
3. Implement `handleLateArrival()` private method
4. Add `walletDiscovered` and `walletRemoved` event subscriptions
5. Implement `refreshDiscovery()` method
6. Update `destroy()` for new state cleanup

### Phase 3: Deprecation Annotations + Export Restructuring

**Files**: `index.ts`

1. Add `@internal` JSDoc to `Eip6963Discovery`, `WalletStandardDiscovery`, `GlobalInjectionDiscovery` exports
2. Add `@deprecated` JSDoc to `DiscoveredProvider` export (internal type)

---

## 6. Detailed Test Plan

### 6.1 Validation Utilities (`src/discovery/validation.test.ts`)

**NEW FILE — all tests new**

#### `validateDataUri()`

| Test | Input | Expected | Assertion |
|------|-------|----------|-----------|
| Valid SVG data URI | `'data:image/svg+xml;base64,PHN2...'` | `true` | `expect(validateDataUri(input)).toBe(true)` |
| Valid PNG data URI | `'data:image/png;base64,iVBOR...'` | `true` | `expect(validateDataUri(input)).toBe(true)` |
| Valid JPEG data URI | `'data:image/jpeg;base64,/9j/4...'` | `true` | `expect(validateDataUri(input)).toBe(true)` |
| Valid WebP data URI | `'data:image/webp;base64,UklGR...'` | `true` | `expect(validateDataUri(input)).toBe(true)` |
| Valid SVG without base64 | `'data:image/svg+xml,<svg>...</svg>'` | `true` | `expect(validateDataUri(input)).toBe(true)` |
| HTTP URL (rejected) | `'https://example.com/icon.svg'` | `false` | `expect(validateDataUri(input)).toBe(false)` |
| Empty string (rejected) | `''` | `false` | `expect(validateDataUri(input)).toBe(false)` |
| Non-image data URI | `'data:text/plain,hello'` | `false` | `expect(validateDataUri(input)).toBe(false)` |
| Malformed data URI | `'data:image/svg'` | `false` | `expect(validateDataUri(input)).toBe(false)` |

#### `validateRdns()`

| Test | Input | Expected | Assertion |
|------|-------|----------|-----------|
| Valid two-segment | `'io.metamask'` | `true` | `expect(validateRdns(input)).toBe(true)` |
| Valid three-segment | `'com.trustwallet.app'` | `true` | `expect(validateRdns(input)).toBe(true)` |
| Valid with hyphens | `'com.crypto-com.wallet'` | `true` | `expect(validateRdns(input)).toBe(true)` |
| Single segment (rejected) | `'metamask'` | `false` | `expect(validateRdns(input)).toBe(false)` |
| Starts with number (rejected) | `'1io.metamask'` | `false` | `expect(validateRdns(input)).toBe(false)` |
| Empty string (rejected) | `''` | `false` | `expect(validateRdns(input)).toBe(false)` |
| Contains spaces (rejected) | `'io. metamask'` | `false` | `expect(validateRdns(input)).toBe(false)` |

#### `validateUuid()`

| Test | Input | Expected | Assertion |
|------|-------|----------|-----------|
| Valid UUID v4 lowercase | `'550e8400-e29b-41d4-a716-446655440000'` | `true` | `expect(validateUuid(input)).toBe(true)` |
| Valid UUID uppercase | `'550E8400-E29B-41D4-A716-446655440000'` | `true` | `expect(validateUuid(input)).toBe(true)` |
| Missing hyphens (rejected) | `'550e8400e29b41d4a716446655440000'` | `false` | `expect(validateUuid(input)).toBe(false)` |
| Too short (rejected) | `'550e8400-e29b'` | `false` | `expect(validateUuid(input)).toBe(false)` |
| Empty string (rejected) | `''` | `false` | `expect(validateUuid(input)).toBe(false)` |

#### `sanitizeProviderName()`

| Test | Input | Expected | Assertion |
|------|-------|----------|-----------|
| Normal name passthrough | `'MetaMask'` | `'MetaMask'` | `expect(sanitizeProviderName(input)).toBe('MetaMask')` |
| Trims whitespace | `'  MetaMask  '` | `'MetaMask'` | `expect(sanitizeProviderName(input)).toBe('MetaMask')` |
| Truncates long name | `'A'.repeat(100)` | `'A'.repeat(64)` | `expect(sanitizeProviderName(input)).toBe('A'.repeat(64))` |
| Empty string | `''` | `''` | `expect(sanitizeProviderName(input)).toBe('')` |

#### `validateAndBuildProviderInfo()`

| Test | Input | Expected | Assertion |
|------|-------|----------|-----------|
| All valid fields | `{name: 'MetaMask', icon: 'data:image/svg+xml;base64,PHN2...', rdns: 'io.metamask', uuid: '550e8400-...'}` | Non-null `EIP6963ProviderInfo` | `expect(result).not.toBeNull(); expect(result!.rdns).toBe('io.metamask')` |
| Invalid rdns | `{name: 'MM', icon: 'data:...', rdns: 'invalid', uuid: '550e...'}` | `null` | `expect(result).toBeNull()` |
| Invalid uuid | `{name: 'MM', icon: 'data:...', rdns: 'io.metamask', uuid: 'not-uuid'}` | `null` | `expect(result).toBeNull()` |
| Invalid icon (graceful) | `{name: 'MM', icon: 'https://...', rdns: 'io.metamask', uuid: '550e...'}` | Non-null, icon is `''` | `expect(result).not.toBeNull(); expect(result!.icon).toBe('')` |
| Name truncated | `{name: 'A'.repeat(100), icon: 'data:...', rdns: 'io.mm', uuid: '550e...'}` | Non-null, name is 64 chars | `expect(result!.name.length).toBe(64)` |

---

### 6.2 Discovery Types (`src/discovery/types.test.ts`)

**Extend existing test file**

#### `DiscoverySource` type

| Test | Description | Assertion |
|------|-------------|-----------|
| EIP-6963 source is valid | Assign `'eip6963'` to `DiscoverySource` variable | TypeScript compilation succeeds; `expect(source).toBe('eip6963')` |
| Wallet Standard source | Assign `'wallet-standard'` | `expect(source).toBe('wallet-standard')` |
| Legacy injection source | Assign `'legacy-injection'` | `expect(source).toBe('legacy-injection')` |
| WalletConnect source | Assign `'walletconnect'` | `expect(source).toBe('walletconnect')` |

#### `EIP6963ProviderInfo` type

| Test | Description | Assertion |
|------|-------------|-----------|
| Construct with all fields | Create object with name, icon, rdns, uuid | `expect(info.rdns).toBe('io.metamask'); expect(info.uuid).toBeDefined()` |

#### `DiscoveredProvider` with discoverySource

| Test | Description | Assertion |
|------|-------------|-----------|
| EIP-6963 provider has discoverySource | Create provider with `discoverySource: 'eip6963'` | `expect(provider.discoverySource).toBe('eip6963')` |
| Legacy provider has both discoverySource and isFallback | Create with `discoverySource: 'legacy-injection', isFallback: true` | `expect(provider.discoverySource).toBe('legacy-injection'); expect(provider.isFallback).toBe(true)` |

#### `DiscoveredWallet` with new fields

| Test | Description | Assertion |
|------|-------------|-----------|
| Wallet with EIP-6963 providerInfo | Create wallet with `providerInfo` set | `expect(wallet.providerInfo).not.toBeNull(); expect(wallet.providerInfo!.rdns).toBe('io.metamask')` |
| Wallet without providerInfo (legacy) | Create wallet with `providerInfo: null` | `expect(wallet.providerInfo).toBeNull()` |
| Wallet with mixed discoverySources | Create wallet with `discoverySources: ['eip6963', 'wallet-standard']` | `expect(wallet.discoverySources).toContain('eip6963'); expect(wallet.discoverySources).toContain('wallet-standard')` |
| Wallet still has deprecated providers field | Create wallet with providers map | `expect(wallet.providers).toBeInstanceOf(Map)` (backwards compat) |

#### `WalletDiscoveredEvent` type

| Test | Description | Assertion |
|------|-------------|-----------|
| Construct event | Create event with wallet and timestamp | `expect(event.wallet.providerId).toBeDefined(); expect(event.timestamp).toBeDefined()` |

#### `WalletRemovedEvent` type

| Test | Description | Assertion |
|------|-------------|-----------|
| Construct event | Create event with providerId and timestamp | `expect(event.providerId).toBe('metamask'); expect(event.timestamp).toBeDefined()` |

---

### 6.3 `Eip6963Discovery` Tests (`src/discovery/Eip6963Discovery.test.ts`)

**Extend existing test file**

| Test | Description | Assertion |
|------|-------------|-----------|
| Providers include discoverySource | After announcing a provider, check the field | `expect(providers[0].discoverySource).toBe('eip6963')` |
| Providers do not have isFallback set | After announcing | `expect(providers[0].isFallback).toBeUndefined()` |
| Callback receives provider with discoverySource | Register callback, trigger announce | `expect(callback).toHaveBeenCalledWith(expect.objectContaining({ discoverySource: 'eip6963' }))` |

---

### 6.4 `WalletStandardDiscovery` Tests (`src/discovery/WalletStandardDiscovery.test.ts`)

**Extend existing test file**

| Test | Description | Assertion |
|------|-------------|-----------|
| Providers include discoverySource | After registering a wallet | `expect(providers[0].discoverySource).toBe('wallet-standard')` |
| Multi-chain wallet: all providers have same discoverySource | Register multi-chain wallet | `providers.forEach(p => expect(p.discoverySource).toBe('wallet-standard'))` |

---

### 6.5 `GlobalInjectionDiscovery` Tests (`src/discovery/GlobalInjectionDiscovery.test.ts`)

**Extend existing test file**

| Test | Description | Assertion |
|------|-------------|-----------|
| EVM fallback has discoverySource 'legacy-injection' | Detect window.ethereum | `expect(provider.discoverySource).toBe('legacy-injection')` |
| EVM fallback retains isFallback: true | Backwards compat | `expect(provider.isFallback).toBe(true)` |
| Solana fallback has discoverySource 'legacy-injection' | Detect window.solana | `expect(provider.discoverySource).toBe('legacy-injection')` |
| SUI fallback has discoverySource 'legacy-injection' | Detect window.suiWallet | `expect(provider.discoverySource).toBe('legacy-injection')` |

---

### 6.6 `ProviderCorrelationService` Tests (`src/discovery/ProviderCorrelationService.test.ts`)

**Extend existing test file**

#### DiscoverySources aggregation

| Test | Description | Input | Assertion |
|------|-------------|-------|-----------|
| Single EIP-6963 provider | One EVM provider via EIP-6963 | `[{...evmProvider, discoverySource: 'eip6963'}]` | `expect(wallets[0].discoverySources).toEqual(['eip6963'])` |
| Multi-protocol wallet (Phantom) | EVM via EIP-6963, Solana via Wallet Standard | Both providers with different sources | `expect(wallet.discoverySources).toContain('eip6963'); expect(wallet.discoverySources).toContain('wallet-standard')` |
| Legacy-only wallet | Single fallback provider | `[{...evmFallback, discoverySource: 'legacy-injection'}]` | `expect(wallets[0].discoverySources).toEqual(['legacy-injection'])` |
| No duplicate sources | Two EVM providers both EIP-6963 (same wallet) | Two providers correlating to same wallet | `expect(wallets[0].discoverySources.length).toBe(1)` |

#### EIP6963ProviderInfo population

| Test | Description | Input | Assertion |
|------|-------------|-------|-----------|
| EIP-6963 wallet gets providerInfo | MetaMask via EIP-6963 with valid data | Provider with `discoverySource: 'eip6963'`, valid rdns, uuid, icon | `expect(wallets[0].providerInfo).not.toBeNull(); expect(wallets[0].providerInfo!.rdns).toBe('io.metamask')` |
| Legacy wallet gets null providerInfo | MetaMask via fallback | Provider with `discoverySource: 'legacy-injection'` | `expect(wallets[0].providerInfo).toBeNull()` |
| Wallet Standard wallet gets null providerInfo | Phantom via Wallet Standard only | Provider with `discoverySource: 'wallet-standard'` | `expect(wallets[0].providerInfo).toBeNull()` |
| Multi-protocol wallet gets providerInfo from EIP-6963 | Phantom via EIP-6963 (EVM) + Wallet Standard (Solana) | Two providers | `expect(wallets[0].providerInfo).not.toBeNull(); expect(wallets[0].providerInfo!.rdns).toBe('app.phantom')` |
| Invalid EIP-6963 data yields null providerInfo | Provider with invalid rdns | `discoverySource: 'eip6963'`, `rdns: 'invalid'` | `expect(wallets[0].providerInfo).toBeNull()` |

#### correlateProvider() (incremental)

| Test | Description | Assertion |
|------|-------------|-----------|
| New wallet from unknown provider | Pass unknown EIP-6963 provider against empty wallet list | `expect(result.isNew).toBe(true); expect(result.wallet.providerId).toBeDefined()` |
| Existing wallet gets new chain family | Pass Solana Wallet Standard Phantom against wallets containing EVM-only Phantom | `expect(result.isNew).toBe(false); expect(result.wallet.supportedChainFamilies).toContain(ChainFamily.SOLANA)` |
| Existing wallet gets new discoverySource | Add wallet-standard provider to eip6963-only wallet | `expect(result.wallet.discoverySources).toContain('wallet-standard')` |
| Duplicate chain family is not added | Pass another EVM provider for already-EVM wallet | `expect(result.wallet.supportedChainFamilies.filter(f => f === ChainFamily.EVM).length).toBe(1)` |

---

### 6.7 `WalletDiscoveryService` Tests (`src/discovery/WalletDiscoveryService.test.ts`)

**Extend existing test file**

#### isDiscoverySettled()

| Test | Description | Assertion |
|------|-------------|-----------|
| Returns false before startDiscovery | Fresh service | `expect(service.isDiscoverySettled()).toBe(false)` |
| Returns true after startDiscovery resolves | After awaiting startDiscovery | `expect(service.isDiscoverySettled()).toBe(true)` |
| Returns false after destroy | After destroy | `expect(service.isDiscoverySettled()).toBe(false)` |
| Returns false during refreshDiscovery | During refresh before completion | `expect(service.isDiscoverySettled()).toBe(false)` |

#### Late-arrival wallet events

| Test | Description | Setup | Assertion |
|------|-------------|-------|-----------|
| Emits walletDiscovered for late EIP-6963 arrival | Complete discovery, then simulate late EIP-6963 announce | Subscribe to walletDiscovered, trigger late announce | `expect(handler).toHaveBeenCalledWith(expect.objectContaining({ wallet: expect.objectContaining({ providerInfo: expect.any(Object) }) }))` |
| Late arrival adds to wallets array | Complete discovery, trigger late announce | Call getDiscoveredWallets after late announce | `expect(service.getDiscoveredWallets().length).toBe(initialCount + 1)` |
| Late arrival updates existing wallet | Complete discovery with MetaMask EVM, then late Wallet Standard Solana | | `expect(wallet.supportedChainFamilies).toContain(ChainFamily.SOLANA)` |
| No walletDiscovered during initial discovery window | Subscribe before startDiscovery | | `expect(handler).not.toHaveBeenCalled()` (only discoveryComplete fires) |

#### refreshDiscovery()

| Test | Description | Assertion |
|------|-------------|-----------|
| Clears previous wallets | After initial discovery returns wallets, refresh | During refresh, wallets are cleared; after refresh, fresh results |
| Returns fresh wallet list | After refresh | `expect(Array.isArray(wallets)).toBe(true)` |
| Re-dispatches eip6963:requestProvider | After refresh | `expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'eip6963:requestProvider' }))` |
| Resets discoverySettled | During refresh | `expect(service.isDiscoverySettled()).toBe(false)` before completion |
| Fires discoveryComplete after refresh | Subscribe and await refresh | `expect(handler).toHaveBeenCalled()` |

#### onWalletDiscovered() / onWalletRemoved()

| Test | Description | Assertion |
|------|-------------|-----------|
| Returns unsubscribe function | Subscribe | `expect(typeof unsubscribe).toBe('function')` |
| Unsubscribe prevents callbacks | Subscribe, unsubscribe, trigger | `expect(handler).not.toHaveBeenCalled()` |

#### Wallets include new fields

| Test | Description | Assertion |
|------|-------------|-----------|
| Discovered wallets have discoverySources | After startDiscovery with any providers | `wallets.forEach(w => expect(w.discoverySources).toBeDefined())` |
| Discovered wallets have providerInfo field | After startDiscovery | `wallets.forEach(w => expect('providerInfo' in w).toBe(true))` |

---

### 6.8 Integration Tests

#### Mixed Discovery Sources (extend `src/test/integration.test.ts` or new file)

| Test | Description | Setup | Assertion |
|------|-------------|-------|-----------|
| EIP-6963 + Wallet Standard for same wallet | Mock both EIP-6963 MetaMask and Wallet Standard MetaMask | Simulate both announce events | `expect(wallets.length).toBe(1); expect(wallets[0].discoverySources).toContain('eip6963'); expect(wallets[0].discoverySources).toContain('wallet-standard')` |
| EIP-6963 only | Mock only EIP-6963 providers | Only EIP-6963 announce events | `expect(wallets[0].discoverySources).toEqual(['eip6963']); expect(wallets[0].providerInfo).not.toBeNull()` |
| Fallback when no EIP-6963 | Mock only window.ethereum | No EIP-6963 events, just global injection | `expect(wallets[0].discoverySources).toEqual(['legacy-injection']); expect(wallets[0].providerInfo).toBeNull()` |
| Late arrival after discovery settles | Mock initial empty, then late EIP-6963 announce | Start discovery, wait for settled, then announce | `expect(lateHandler).toHaveBeenCalledWith(expect.objectContaining({ wallet: expect.objectContaining({ providerInfo: expect.any(Object) }) }))` |
| Refresh clears and re-discovers | Discover, then modify available providers, then refresh | Compare wallets before and after refresh | Wallet list reflects new provider state |
| End-to-end discovery lifecycle | Multiple wallets via multiple protocols | Full startDiscovery flow | Correct number of wallets, correct discoverySources, correct providerInfo on each |

---

## 7. Security Implementation Details

### 7.1 Validation Boundary

All EIP-6963 data is validated at the correlation step, BEFORE it reaches the public `DiscoveredWallet` type. The validation happens inside `ProviderCorrelationService.correlate()` when calling `validateAndBuildProviderInfo()`.

```
Raw EIP-6963 event data
    │
    ▼ (stored as-is in Eip6963Discovery internal state)
DiscoveredProvider (internal, has raw fields)
    │
    ▼ (passed to ProviderCorrelationService)
validateAndBuildProviderInfo()
    ├── validateDataUri(icon)     → reject non-data-URI
    ├── validateRdns(rdns)        → reject malformed RDNS
    ├── validateUuid(uuid)        → reject malformed UUID
    ├── sanitizeProviderName(name) → truncate to 64 chars
    │
    ▼
EIP6963ProviderInfo | null  (sanitized, safe for public API)
    │
    ▼ (attached to DiscoveredWallet.providerInfo)
Public API consumer (CWA)
```

### 7.2 Icon Handling

Icons from EIP-6963 are data URIs. The validation ensures:
- Only `data:image/*` MIME types are accepted
- HTTP/HTTPS URLs are rejected (potential XSS vector if rendered unsafely)
- If the icon fails validation, `providerInfo` is still created but with `icon: ''` (graceful degradation — the wallet is still discoverable, just without its custom icon)

CWA should still render icons in sandboxed contexts (CSP, `<img>` tags not `innerHTML`) — that's an Experience domain concern per en-7hfo Section 10, but WIS provides the first line of defense.

---

## 8. Backwards Compatibility Matrix

| Change | Breaking? | Migration |
|--------|-----------|-----------|
| New `discoverySource` field on `DiscoveredProvider` | No — additive mandatory field. Existing consumers don't read it. | None needed |
| Deprecated `isFallback` on `DiscoveredProvider` | No — field still present, still populated. JSDoc warning only. | Consumers should migrate to `discoverySource === 'legacy-injection'` |
| New `providerInfo` field on `DiscoveredWallet` | No — additive nullable field | None needed |
| New `discoverySources` field on `DiscoveredWallet` | No — additive field | None needed |
| Deprecated `providers` on `DiscoveredWallet` | No — field still present, still populated. JSDoc warning only. | Consumers should migrate to using WalletDiscoveryService methods |
| New events on `WalletDiscoveryService` | No — additive | Consumers can subscribe if they want real-time updates |
| New methods on `WalletDiscoveryService` | No — additive | None needed |
| `@internal` on discovery class exports | No — classes still exported. JSDoc annotation only. | Consumers should prefer WalletDiscoveryService |

---

## 9. Dependencies and Assumptions

### 9.1 No Changes to External Packages

- `@cygnus-wealth/data-models` — No changes in this phase. Domain arch recommends promoting types to data-models in Phase 3 (future work).
- `ChainFamily`, `WalletProviderId`, `WalletConnectionId` — Used as-is from data-models.

### 9.2 TypedEventEmitter Adequacy

The existing `TypedEventEmitter` class supports all needed patterns:
- `on(event, handler)` with unsubscribe return
- `emit(event, data)` for broadcasting
- `removeAllListeners()` for cleanup

No changes needed to the utility.

### 9.3 Browser Environment Assumption

All discovery code assumes browser environment with `window` global. The validation module is pure functions with no browser dependency (testable in Node/Vitest).
