# Domain Architecture: EIP-6963 Wallet Discovery Integration

**Directive**: en-7hfo (EIP-6963 Wallet Discovery Integration)
**Bead**: wa-uug
**Date**: 2026-02-25
**Scope**: WIS public API surface changes for EIP-6963 discovery integration per en-7hfo
**Builds On**: en-o8w (Multi-Chain Wallet Unification), en-fr0z (Multi-Wallet Multi-Account Architecture)

---

## 1. Executive Summary

WIS already implements EIP-6963 discovery internally (`Eip6963Discovery`, `WalletStandardDiscovery`, `GlobalInjectionDiscovery`, `ProviderCorrelationService`). However, the **public API surface** does not fully expose the capabilities en-7hfo requires for CWA consumption. This document identifies the gaps and specifies the public API changes needed.

**Key finding**: WIS has all the internal machinery but needs to surface discovery source metadata, structured branding info, and real-time discovery events at the public API boundary.

---

## 2. Current Public API Surface Audit

### 2.1 Exported from `src/index.ts`

**Discovery classes (all exported):**
- `WalletDiscoveryService` — primary discovery facade
- `ProviderCorrelationService` — correlates providers into wallets
- `Eip6963Discovery` — EIP-6963 protocol handler
- `WalletStandardDiscovery` — Wallet Standard protocol handler
- `GlobalInjectionDiscovery` — Legacy `window.*` fallback

**Discovery types (all exported):**
- `DiscoveredProvider` — per-protocol provider data (includes raw `provider: unknown`)
- `DiscoveredWallet` — correlated multi-chain wallet
- `DiscoveryCompleteEvent` — fired after initial discovery round
- `ChainFamilyConnectionChangedEvent` (aliased as `DiscoveryChainFamilyConnectionChangedEvent`)

**Correlation utilities (all exported):**
- `WALLET_CORRELATIONS`, `CAIP2_NAMESPACE_TO_CHAIN_FAMILY`
- `getCorrelationByRdns`, `getCorrelationByName`, `getCorrelationByProviderId`
- `chainFamilyFromCaip2Namespace`

### 2.2 Current `DiscoveredWallet` Type

```typescript
interface DiscoveredWallet {
  providerId: WalletProviderId | string;
  name: string;
  icon: string;
  supportedChainFamilies: ChainFamily[];
  isMultiChain: boolean;
  providers: Map<ChainFamily, DiscoveredProvider>;
}
```

### 2.3 Current `DiscoveredProvider` Type

```typescript
interface DiscoveredProvider {
  chainFamily: ChainFamily;
  name: string;
  icon: string;
  provider: unknown;   // Raw provider object
  rdns?: string;
  uuid?: string;
  isFallback?: boolean;
}
```

### 2.4 Current `WalletDiscoveryService` Capabilities

| Method | Description |
|--------|-------------|
| `startDiscovery(options?)` | Runs all protocols, waits for timeout, returns `DiscoveredWallet[]` |
| `getDiscoveredWallets()` | Returns cached wallet list |
| `getWalletCapabilities(providerId)` | Returns `ChainFamily[]` for a wallet |
| `onDiscoveryComplete(handler)` | Subscribe to discovery complete event |
| `destroy()` | Clean up listeners |

---

## 3. Gap Analysis: en-7hfo Requirements vs. Current API

### 3.1 Query Capabilities

| en-7hfo Requirement | Current Status | Gap |
|---------------------|---------------|-----|
| Enumerate discovered wallets with `WalletProviderInfo` branding | `getDiscoveredWallets()` returns `DiscoveredWallet[]` with `name` and `icon` | `DiscoveredWallet` lacks structured `WalletProviderInfo` — no `rdns` or `uuid` at wallet level. These exist only on `DiscoveredProvider` which leaks raw provider objects. |
| Query discovery source per wallet | No field exists | `DiscoveredWallet` has no `discoverySource` indicator. `DiscoveredProvider.isFallback` is boolean-only — no differentiation between EIP-6963, Wallet Standard, and WalletConnect. |
| Query discovery readiness | `onDiscoveryComplete` event exists | No synchronous `isDiscoverySettled()` query method. The event exists but consumers cannot poll readiness state. |

### 3.2 Event Capabilities

| en-7hfo Requirement | Current Status | Gap |
|---------------------|---------------|-----|
| Wallet discovered (late arrival) | `Eip6963Discovery` has internal `onProviderDiscovered` callbacks | `WalletDiscoveryService` does NOT surface late-arriving wallets as events. After `startDiscovery()` resolves, new EIP-6963 announcements are captured internally but never emitted to consumers. |
| Wallet removed | Not implemented | No removal detection exists. EIP-6963 doesn't define removal, but browser extension disable/remove should be detectable. |
| Discovery settled | `discoveryComplete` event fires after initial timeout | Conceptually equivalent. Adequate for Phase 1. |

### 3.3 Command Capabilities

| en-7hfo Requirement | Current Status | Gap |
|---------------------|---------------|-----|
| Request discovery refresh | No method | `startDiscovery()` does not support re-invocation cleanly. No `refreshDiscovery()` method. Need to re-dispatch `eip6963:requestProvider` and re-probe all protocols. |
| Connect discovered wallet | `WalletConnectionService.connectWallet(providerId, ...)` exists | Adequate. Unchanged per en-fr0z/en-o8w. |

### 3.4 Type/Data Gaps

| en-7hfo Requirement | Current Status | Gap |
|---------------------|---------------|-----|
| `WalletProviderInfo` on `DiscoveredWallet` | `multi-wallet.ts` has a `WalletProviderInfo` but it contains `providerId` and `isAvailable` — different concept | Need EIP-6963-specific `WalletProviderInfo` (name, icon, rdns, uuid) as defined in en-7hfo Section 4. The existing `WalletProviderInfo` in multi-wallet.ts serves a different purpose (provider catalog), not EIP-6963 branding. |
| Discovery source indicator | Not present | Need `DiscoverySource` enum: `'eip6963' \| 'wallet-standard' \| 'legacy-injection' \| 'walletconnect'` |

---

## 4. API Encapsulation Issues

The current exports leak internal implementation details that should NOT cross the Integration → Experience boundary:

### 4.1 Raw Provider Leakage

`DiscoveredProvider.provider: unknown` contains raw EIP-1193 provider objects and Wallet Standard wallet objects. Per en-7hfo Section 2: "CWA never receives raw EIP-1193 provider references. WIS mediates all provider interactions."

**Current**: `DiscoveredWallet.providers: Map<ChainFamily, DiscoveredProvider>` is exported, giving consumers direct access to raw providers.

**Required**: Raw providers must stay WIS-internal. The public `DiscoveredWallet` type should not expose the `providers` map.

### 4.2 Internal Discovery Class Leakage

`Eip6963Discovery`, `WalletStandardDiscovery`, and `GlobalInjectionDiscovery` are all exported from `src/index.ts`. Per en-7hfo Section 2, CWA should never interact with individual discovery protocols — it consumes only `WalletDiscoveryService`.

**Recommendation**: These classes should remain importable for testing/advanced use but the primary public contract should be `WalletDiscoveryService` + types only. Consider a tiered export strategy:
- `src/index.ts` — public API (WalletDiscoveryService, types, connection services)
- `src/discovery/index.ts` — internal discovery classes (for WIS-internal consumption and testing)

---

## 5. Recommended Changes

### 5.1 New Type: `EIP6963ProviderInfo`

Add to `src/discovery/types.ts`:

A structured type representing EIP-6963 branding metadata that crosses the Integration → Experience boundary. Contains:
- `name: string` — Human-readable wallet name
- `icon: string` — Data URI (SVG or PNG) of wallet icon
- `rdns: string` — Reverse DNS identifier (e.g., `io.metamask`)
- `uuid: string` — Unique session identifier for this provider instance

This is distinct from the existing `WalletProviderInfo` in `multi-wallet.ts` which serves the provider catalog purpose (contains `providerId` and `isAvailable`).

### 5.2 New Type: `DiscoverySource`

Add to `src/discovery/types.ts`:

A union type indicating how a wallet was discovered:
- `'eip6963'` — EIP-6963 Multi Injected Provider Discovery
- `'wallet-standard'` — Wallet Standard protocol
- `'legacy-injection'` — Global `window.*` property detection (fallback)
- `'walletconnect'` — WalletConnect v2 session (future)

### 5.3 Extend `DiscoveredWallet`

Modify `src/discovery/types.ts` `DiscoveredWallet` interface:

**Add fields:**
- `providerInfo: EIP6963ProviderInfo | null` — EIP-6963 branding when available, null for legacy/non-EIP-6963 wallets
- `discoverySources: DiscoverySource[]` — All protocols that detected this wallet (a multi-chain wallet may be detected via EIP-6963 for EVM and Wallet Standard for Solana)

**Remove from public type:**
- `providers: Map<ChainFamily, DiscoveredProvider>` — This leaks raw provider objects. Should be WIS-internal only.

**Keep unchanged:**
- `providerId`, `name`, `icon`, `supportedChainFamilies`, `isMultiChain`

### 5.4 Extend `DiscoveredProvider` (Internal)

Add to `DiscoveredProvider`:
- `discoverySource: DiscoverySource` — Replace the boolean `isFallback` with an explicit source enum

### 5.5 New Events on `WalletDiscoveryService`

Add to `WalletDiscoveryService`:

**Events:**
- `walletDiscovered` — Emitted when a new wallet is detected after initial discovery (late EIP-6963 announcements). Payload: `{ wallet: DiscoveredWallet }`
- `walletRemoved` — Emitted when a previously discovered wallet is no longer available. Payload: `{ providerId: WalletProviderId | string }`
- `discoverySettled` — Alias/clarification of existing `discoveryComplete`. Emitted when discovery window has elapsed.

### 5.6 New Methods on `WalletDiscoveryService`

**Query methods:**
- `isDiscoverySettled(): boolean` — Synchronous check of whether initial discovery is complete
- `getDiscoverySourcesForWallet(providerId: string): DiscoverySource[]` — Query which protocols detected a specific wallet

**Command methods:**
- `refreshDiscovery(): Promise<DiscoveredWallet[]>` — Re-dispatch `eip6963:requestProvider`, re-probe Wallet Standard, re-check global injections. Returns updated wallet list. Must handle cleanup of stale state from previous discovery round.

### 5.7 Propagate Late Arrivals

`WalletDiscoveryService` must wire up `Eip6963Discovery.onProviderDiscovered` and `WalletStandardDiscovery.onProviderDiscovered` to:
1. Run the new provider through `ProviderCorrelationService`
2. Either update an existing `DiscoveredWallet` (new chain family for known wallet) or create a new one
3. Emit `walletDiscovered` event to consumers

Currently, these callbacks are registered internally in `Eip6963Discovery` and `WalletStandardDiscovery` but `WalletDiscoveryService` does not subscribe to them after `startDiscovery()` returns.

---

## 6. Data Models Coordination

### 6.1 `DiscoveredWallet` Type Extension

The `DiscoveredWallet` type is currently defined in WIS (`src/discovery/types.ts`), not in `@cygnus-wealth/data-models`. If CWA is to consume this type, it should be promoted to the shared data models package.

**Recommendation**: Define the public-facing `DiscoveredWallet` (without raw providers) in `@cygnus-wealth/data-models` as a cross-domain contract type. WIS-internal operations can use an extended version with `providers` map.

### 6.2 `EIP6963ProviderInfo`

This type should also be defined in `@cygnus-wealth/data-models` since it crosses the Integration → Experience boundary.

### 6.3 `DiscoverySource` Enum

Should be defined in `@cygnus-wealth/data-models` as it's part of the cross-domain contract.

### 6.4 Existing `WalletProviderInfo` Clarification

The existing `WalletProviderInfo` in `multi-wallet.ts` (with `providerId`, `name`, `icon`, `isAvailable`) serves a different purpose than `EIP6963ProviderInfo`. The existing type is a provider catalog entry; the new type is runtime branding from an EIP-6963 announcement. Both should coexist. Consider renaming:
- `WalletProviderInfo` → keep as-is (catalog entry, used in connection context)
- `EIP6963ProviderInfo` → new type (runtime branding from discovery)

---

## 7. Backwards Compatibility

### 7.1 Additive Changes Only

All proposed changes are **additive**:
- New fields on `DiscoveredWallet` (existing fields unchanged)
- New events on `WalletDiscoveryService` (existing events unchanged)
- New methods on `WalletDiscoveryService` (existing methods unchanged)
- New types (`EIP6963ProviderInfo`, `DiscoverySource`)

### 7.2 Breaking Change: `providers` Map Removal

Removing `providers: Map<ChainFamily, DiscoveredProvider>` from the public `DiscoveredWallet` type is a breaking change. This should be handled in two phases:

**Phase 1**: Add new fields alongside `providers`. Mark `providers` as `@deprecated` in JSDoc. Export a new `PublicDiscoveredWallet` type without `providers` for forward-looking consumers.

**Phase 2**: Remove `providers` from `DiscoveredWallet` in a future major version, or when CWA has migrated to the new fields.

### 7.3 Export Restructuring

Moving internal discovery classes out of the main export is also a breaking change. Use the same phased approach:

**Phase 1**: Keep all exports. Add `@internal` JSDoc annotations to `Eip6963Discovery`, `WalletStandardDiscovery`, `GlobalInjectionDiscovery`.

**Phase 2**: Move internal classes to a `src/discovery/internal.ts` barrel export.

---

## 8. Security Considerations

Per en-7hfo Section 10, all en-fr0z and en-o8w security guarantees carry forward:

- **No private key access** — discovery enumerates wallets, never accesses keys
- **No transaction signing** — discovery never invokes signing methods
- **Icon data sanitization** — `EIP6963ProviderInfo.icon` is a data URI from wallet extensions. CWA must treat as untrusted content. WIS should validate data URI format before including in `EIP6963ProviderInfo`.
- **RDNS is not authority** — `rdns` is self-reported, useful for matching but not security assertions

**New security requirement**: WIS must sanitize `EIP6963ProviderInfo` fields before crossing the boundary:
- Validate `icon` is a well-formed data URI (reject non-data-URI values)
- Validate `rdns` matches reverse DNS format
- Validate `uuid` matches UUID format
- Truncate `name` to reasonable length

---

## 9. Implementation Guidance for System/BC Arch

### 9.1 Phased Rollout

**Phase 1 (Minimal viable contract)**:
1. Add `DiscoverySource` type and `discoverySource` field to `DiscoveredProvider`
2. Add `EIP6963ProviderInfo` type
3. Add `providerInfo` and `discoverySources` fields to `DiscoveredWallet`
4. Add `isDiscoverySettled()` to `WalletDiscoveryService`
5. Populate new fields in `ProviderCorrelationService.correlate()`

**Phase 2 (Event-driven discovery)**:
1. Add `walletDiscovered` event to `WalletDiscoveryService`
2. Wire late-arrival callbacks through correlation pipeline
3. Add `refreshDiscovery()` method
4. Add `walletRemoved` event (if browser extension removal detection is feasible)

**Phase 3 (API cleanup)**:
1. Deprecate `DiscoveredProvider` in public exports
2. Deprecate internal discovery class exports
3. Promote `DiscoveredWallet`, `EIP6963ProviderInfo`, `DiscoverySource` to `@cygnus-wealth/data-models`

### 9.2 Files Affected

| File | Change Type |
|------|------------|
| `src/discovery/types.ts` | Add `EIP6963ProviderInfo`, `DiscoverySource`, extend `DiscoveredWallet` and `DiscoveredProvider` |
| `src/discovery/Eip6963Discovery.ts` | Set `discoverySource: 'eip6963'` on produced providers |
| `src/discovery/WalletStandardDiscovery.ts` | Set `discoverySource: 'wallet-standard'` on produced providers |
| `src/discovery/GlobalInjectionDiscovery.ts` | Set `discoverySource: 'legacy-injection'`, replace `isFallback` |
| `src/discovery/ProviderCorrelationService.ts` | Aggregate `discoverySources`, build `providerInfo` from EIP-6963 providers |
| `src/discovery/WalletDiscoveryService.ts` | Add events, methods, late-arrival wiring, `isDiscoverySettled()`, `refreshDiscovery()` |
| `src/index.ts` | Export new types, annotate internal exports |

### 9.3 Testing Requirements

- Unit tests for `DiscoverySource` propagation through correlation pipeline
- Unit tests for `EIP6963ProviderInfo` population
- Unit tests for `isDiscoverySettled()` state management
- Unit tests for `refreshDiscovery()` re-initialization
- Integration tests for late-arrival wallet discovery events
- Integration tests for mixed discovery sources (EIP-6963 + Wallet Standard for same wallet)

---

## 10. Cross-Domain Contract Summary

| Contract Element | Status | Details |
|-----------------|--------|---------|
| `DiscoveredWallet` with `EIP6963ProviderInfo` | **Needs addition** | Add `providerInfo` field with branding metadata |
| `DiscoveredWallet` with `DiscoverySource` | **Needs addition** | Add `discoverySources` field |
| Discovery readiness query | **Needs addition** | Add `isDiscoverySettled()` method |
| Late-arrival wallet events | **Needs addition** | Add `walletDiscovered` event on `WalletDiscoveryService` |
| Wallet removal events | **Needs addition** | Add `walletRemoved` event |
| Discovery refresh | **Needs addition** | Add `refreshDiscovery()` method |
| Connect discovered wallet | **No change** | Existing en-fr0z/en-o8w connect path adequate |
| Raw provider encapsulation | **Needs deprecation** | `DiscoveredWallet.providers` leaks raw providers; phase out |
| Internal class encapsulation | **Needs deprecation** | `Eip6963Discovery` etc. should be internal-only |
| DataModels promotion | **Needs coordination** | `DiscoveredWallet`, `EIP6963ProviderInfo`, `DiscoverySource` should move to shared package |
