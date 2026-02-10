# Plan of Action: Add Binance & Bybit to compare-liquidity-ui

## Current State

| Layer | Exchanges Supported |
|-------|-------------------|
| **CLI** (`compare-liquidity`) | Hyperliquid, dYdX, Lighter, AsterDEX, **Binance**, **Bybit** |
| **UI** (`compare-liquidity-ui`) | Hyperliquid, dYdX, Lighter, AsterDEX |

**Gap:** Binance and Bybit are missing from the UI.

The UI is a Next.js 15 + Recharts dashboard that polls each exchange every 1.5s via a server-side API proxy (`/api/orderbook`), parses responses client-side, computes slippage, and renders spread cards + bar charts + a data table.

---

## Changes Required

### 1. Types — `src/lib/types.ts`

Add `"binance"` and `"bybit"` to the `ExchangeKey` union type.

```diff
- export type ExchangeKey = "hyperliquid" | "dydx" | "lighter" | "asterdex";
+ export type ExchangeKey = "hyperliquid" | "dydx" | "lighter" | "asterdex" | "binance" | "bybit";
```

This single change propagates type-safety across every file that references `ExchangeKey`.

---

### 2. Constants — `src/lib/constants.ts`

**a) EXCHANGES array**
```diff
- export const EXCHANGES: ExchangeKey[] = ["hyperliquid", "dydx", "lighter", "asterdex"];
+ export const EXCHANGES: ExchangeKey[] = ["hyperliquid", "dydx", "lighter", "asterdex", "binance", "bybit"];
```

**b) EXCHANGE_LABELS**
```diff
  asterdex: "AsterDEX",
+ binance: "Binance",
+ bybit: "Bybit",
```

**c) EXCHANGE_COLORS** — pick two distinct colors that don't clash with existing (brown, purple, green, orange):
```diff
  asterdex: "#c88832",
+ binance: "#f0b90b",   // Binance yellow
+ bybit: "#f7a600",     // Bybit orange — or use a blue like "#3b82f6" to contrast better
```

> Suggestion: Use `"#f0b90b"` (Binance brand yellow) and `"#5a67d8"` (indigo/blue for Bybit) for clear visual separation.

**d) TICKER_MAP** — add Binance and Bybit symbol mappings:
```diff
  BTC: {
    hyperliquid: "BTC", dydx: "BTC-USD", lighter: "BTC-USD", asterdex: "BTCUSDT",
+   binance: "BTCUSDT", bybit: "BTCUSDT",
  },
  ETH: {
    hyperliquid: "ETH", dydx: "ETH-USD", lighter: "ETH-USD", asterdex: "ETHUSDT",
+   binance: "ETHUSDT", bybit: "ETHUSDT",
  },
  SOL: {
    hyperliquid: "SOL", dydx: "SOL-USD", lighter: "SOL-USD", asterdex: "SOLUSDT",
+   binance: "SOLUSDT", bybit: "SOLUSDT",
  },
```

---

### 3. Exchange Parsers — `src/lib/exchanges/`

Create two new files mirroring the existing pattern (parse raw JSON into `NormalizedBook`):

**a) `src/lib/exchanges/binance.ts`**

- Input: Binance Futures depth response `{ bids: [[price, qty], ...], asks: [...], T, E, lastUpdateId }`
- Parse each `[price, qty]` tuple into `{ px, sz }`, filter zero-size levels, sort bids desc / asks asc.
- Timestamp from `T` field.

**b) `src/lib/exchanges/bybit.ts`**

- Input: Bybit v5 response `{ retCode, retMsg, result: { b: [[price, size], ...], a: [...], ts, s, u } }`
- Parse `result.b` / `result.a` tuples into `{ px, sz }`.
- Validate `retCode === 0`.
- Timestamp from `result.ts`.

Both are straightforward — nearly identical to the existing `asterdex.ts` parser structure.

**c) Register in `src/lib/exchanges/index.ts`**

Add both parsers to `EXCHANGE_REGISTRY`.

---

### 4. API Route — `src/app/api/orderbook/route.ts`

Add upstream request builders for the two new exchanges:

| Exchange | Method | URL |
|----------|--------|-----|
| **Binance** | GET | `https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=1000` |
| **Bybit** | GET | `https://api.bybit.com/v5/market/orderbook?category=linear&symbol={symbol}&limit=500` |

Both are simple GET requests — follow the same pattern as AsterDEX.

---

### 5. UI Components — No Changes Needed

The dashboard components are already data-driven:

- **SpreadCards** iterates `EXCHANGES` array — new exchanges get cards automatically.
- **SlippageChart** builds `<Bar>` elements from `EXCHANGE_REGISTRY` — new exchanges get chart bars automatically.
- **DataTable** iterates exchanges — new rows appear automatically.
- **PulseDot** works per-exchange status — no changes.

The grid layout (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`) may look better as `xl:grid-cols-3` with 6 items (2 rows of 3) instead of 4+2. This is optional.

---

### 6. Polling Hook — `src/hooks/use-liquidity-poll.ts`

No code changes needed — it already iterates `EXCHANGES` to build `Promise.allSettled()` calls. Adding exchanges to the constant auto-enrolls them in polling.

---

## File Change Summary

| File | Action | Effort |
|------|--------|--------|
| `src/lib/types.ts` | Edit `ExchangeKey` union | Trivial |
| `src/lib/constants.ts` | Add labels, colors, ticker maps | Small |
| `src/lib/exchanges/binance.ts` | **New file** — response parser | Small |
| `src/lib/exchanges/bybit.ts` | **New file** — response parser | Small |
| `src/lib/exchanges/index.ts` | Register new parsers | Trivial |
| `src/app/api/orderbook/route.ts` | Add upstream URL builders | Small |
| `src/components/spread-cards.tsx` | Optional: grid layout tweak for 6 columns | Optional |

**Total: ~6 files touched, 2 new files. No architectural changes.**

---

## Execution Order

1. `types.ts` — add to union (everything else will type-error until complete)
2. `constants.ts` — labels, colors, ticker map
3. `exchanges/binance.ts` + `exchanges/bybit.ts` — new parsers
4. `exchanges/index.ts` — register parsers
5. `api/orderbook/route.ts` — add upstream fetch logic
6. Verify in browser — all 6 exchanges should appear
7. Optional: adjust grid layout for 6-card display

---

## Considerations

- **Rate limits**: Binance (2400 req/min) and Bybit (120 req/min on public) are generous enough for 1.5s polling.
- **CORS**: Both APIs block browser requests — the existing Next.js proxy pattern handles this.
- **Bybit depth limit**: Max 500 levels via REST (vs Binance 1000). Sufficient for $1M fills on major pairs.
- **Hyperliquid depth**: The UI currently uses a single `l2Book` call (20 levels). Consider porting the hybrid precise+aggregated approach from the CLI for better $100K+ accuracy. This is a separate improvement, not blocking Binance/Bybit addition.
