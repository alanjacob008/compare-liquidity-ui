# Orderbook API endpoints for perpetual futures exchanges

1. https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api - Hyperliquid
2. https://apidocs.lighter.xyz/docs/get-started-for-programmers-1 - Lighter
3. https://docs.asterdex.com/product/aster-perpetuals/api/api-documentation#market-data-endpoints - AsterDEX
4. https://developers.binance.com/docs/derivatives/usds-margined-futures/general-info - Binance
5. https://bybit-exchange.github.io/docs/v5/guide - Bybit
6. https://docs.dydx.xyz/indexer-client/http#get-perpetual-market-orderbook - dYdX
Example dYdX endpoint: https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/BTC-USD

## Brand colors
Hyperliquid: #96FCE4
AsterDEX: #C99F6F
dYdX: #7774FF
Binance: #FCD535
Bybit: #FF9C2E
Lighter: #121218 / #F3F3F3

Every major perpetual futures exchange exposes a public, unauthenticated REST endpoint for fetching orderbook snapshots. Interface styles vary. Binance, AsterDEX, and Bybit use conventional GET requests with query parameters, Hyperliquid uses a POST-based RPC pattern, Lighter uses numeric market IDs instead of ticker symbols, and dYdX uses the indexer REST API.

---

## 1. Hyperliquid - POST-based RPC on a single /info route

Hyperliquid consolidates all public queries behind a single POST /info endpoint. The request body's type field determines the data.

| Detail | Value |
| --- | --- |
| Type | REST (POST) |
| Base URL | https://api.hyperliquid.xyz |
| Endpoint | POST /info |
| Content-Type | application/json |
| Auth required | No |

Parameters (JSON body):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| type | string | Yes | Must be "l2Book" |
| coin | string | Yes | Asset ticker, e.g. "BTC", "ETH", "SOL" |
| nSigFigs | int | No | Aggregate levels to N significant figures. Valid: 2, 3, 4, 5 |
| mantissa | int | No | Further aggregation when nSigFigs = 5. Valid: 1, 2, 5 |

Example request (BTC perpetual):

```bash
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type":"l2Book","coin":"BTC"}'
```

Response returns up to 20 levels per side in levels where levels[0] = bids (descending) and levels[1] = asks (ascending). Each level includes px (price), sz (size), and n (order count).

Important limitation (depth): Hyperliquid docs explicitly state: "Returns at most 20 levels per side." (Hyperliquid API docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api — also visible in the GitBook PDF render at https://hyperliquid.gitbook.io/hyperliquid-docs/~gitbook/pdf?path=/for-developers/api). In testing, adding depth or nLevels does not increase the returned count.

What you can change: aggregation granularity via nSigFigs (and sometimes mantissa), which changes bucketing but still returns up to 20 levels.

WebSocket: Hyperliquid also serves market data over WebSocket at wss://api.hyperliquid.xyz/ws (testnet: wss://api.hyperliquid-testnet.xyz/ws). This is useful for lower-latency updates, but it does not change the "at most 20 levels per side" limit for l2Book.

Live view behavior in this UI:
- Default Hyperliquid request uses nSigFigs=5 (finest documented aggregation) for spread and slippage.
- If any slippage tier is partial at nSigFigs=5, the app automatically retries Hyperliquid with nSigFigs=4 and uses that as an aggregated fallback estimate.
- UI labels this case as "Aggregated estimate" to avoid implying deeper raw orderbook depth.

Rate limits: 1,200 weighted requests per minute per IP. l2Book costs weight 2.

---

## 2. Lighter - numeric market IDs via REST GET + WebSocket fallback

Lighter identifies markets by integer index rather than ticker symbol. Use GET /api/v1/orderBooks to discover available market IDs.

### REST endpoint

| Detail | Value |
| --- | --- |
| Type | REST (GET) |
| Base URL | https://mainnet.zklighter.elliot.ai |
| Endpoint | GET /api/v1/orderBookOrders |
| Auth required | No |

Parameters (query string):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| market_id | int | Yes | Numeric market identifier |
| limit | int | Yes | Number of orders per side to return. Range: 1–250 |

Example request (BTC perpetual):

```
GET https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=1&limit=250
```

Response contains bids and asks arrays of individual orders with `price` and `remaining_base_amount` strings. Orders at the same price must be aggregated client-side.

Important limitation (depth): The `limit` parameter has a **hard maximum of 250** (the API returns error code 20001 "invalid param" for any value above 250). There is no pagination (no offset, cursor, or page parameter). The `total_bids` / `total_asks` fields in the response simply echo the limit back — they do not report total orders on the book.

For less liquid tokens (e.g. LIT), 250 orders per side can cover far less than the actual book depth. Tested 2026-02-12 on LIT (market_id=120):

| Source | Bid levels | Ask levels | Ask notional | $1M fill |
| --- | --- | --- | --- | --- |
| REST (limit=250) | 191 unique | 201 unique | ~$868K | **Partial** |
| WebSocket (full) | **798** | **1,662** | **$6.15M** | **Full** |

The REST API cut off ~88% of the ask-side book for LIT. There is **no REST endpoint that returns aggregated price levels** — orderBookOrders is the only orderbook REST endpoint.

### WebSocket endpoint (full depth, aggregated levels)

| Detail | Value |
| --- | --- |
| Type | WebSocket |
| URL | wss://mainnet.zklighter.elliot.ai/stream |
| Auth required | No |

Subscribe by sending:
```json
{"type": "subscribe", "channel": "order_book/{MARKET_ID}"}
```

The server sends a full L2-aggregated snapshot on subscription (no depth limit), then incremental delta updates every ~50ms. Each level has `price` and `size` (already aggregated by price). Continuity is verified via `begin_nonce` matching the previous message's `nonce`.

Live view behavior in this UI:
- Default Lighter request uses the REST endpoint with limit=250.
- If any slippage tier shows partial fill on the REST data, the app automatically opens a one-shot WebSocket connection to fetch the full aggregated book as a fallback.
- UI labels this case as "WebSocket depth (REST API capped at 250 orders)" to indicate the data source switch.

Rate limits: standard accounts 60 requests per minute; premium accounts 24,000 weighted requests per minute. orderBookOrders has weight 300. WebSocket connections have no documented rate limit for public reads.

---

## 3. AsterDEX - Binance-compatible /fapi/v1/depth interface

AsterDEX mirrors the Binance Futures API structure.

| Detail | Value |
| --- | --- |
| Type | REST (GET) |
| Base URL | https://fapi.asterdex.com |
| Endpoint | GET /fapi/v1/depth |
| Auth required | No |

Parameters (query string):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| symbol | string | Yes | Trading pair, e.g. BTCUSDT |
| limit | int | No | Default 500. Valid: 5, 10, 20, 50, 100, 500, 1000 |

Example request (BTC perpetual, 20 levels):

```
GET https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=20
```

Response includes bids and asks as arrays of [price, quantity], plus lastUpdateId, E, and T.

Rate limits: 2,400 weight per minute per IP. Weight scales with depth: 2 (<=50), 5 (100), 10 (500), 20 (1000).

---

## 4. Binance USDS-Margined Futures - the /fapi/v1/depth standard

| Detail | Value |
| --- | --- |
| Type | REST (GET) |
| Base URL | https://fapi.binance.com |
| Endpoint | GET /fapi/v1/depth |
| Auth required | No |

Parameters (query string):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| symbol | string | Yes | Trading pair, e.g. BTCUSDT |
| limit | int | No | Default 500. Valid: 5, 10, 20, 50, 100, 500, 1000 |

Example request (BTC/USDT perpetual, full depth):

```
GET https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000
```

Response structure is identical to AsterDEX. RPI orders are excluded.

Rate limits: 2,400 weight per minute per IP. Monitor X-MBX-USED-WEIGHT-1m header.

---

## 5. Bybit V5 - category-aware GET /v5/market/orderbook

Bybit V5 uses a unified endpoint across product types, distinguished by category. For USDT or USDC perpetuals, use category=linear.

| Detail | Value |
| --- | --- |
| Type | REST (GET) |
| Base URL | https://api.bybit.com |
| Endpoint | GET /v5/market/orderbook |
| Auth required | No |

Parameters (query string):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| category | string | Yes | Product type: linear, inverse, spot, option |
| symbol | string | Yes | Symbol in uppercase, e.g. BTCUSDT |
| limit | int | No | Levels per side. Docs say linear/inverse max 500, but **actual API returns up to 1,000** (tested 2026-02-12). Default 25. For spot: 1-200. For option: 1-25 |

Example request (BTC/USDT linear perpetual, 50 levels):

```
GET https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=50
```

Response nests data under result with b (bids) and a (asks) as [price, size] arrays. Includes u (update ID), seq, and cts.

Rate limits: 600 requests per 5-second window per IP across all market data endpoints. Exceeding can trigger a 10-minute IP ban with 403 response. Monitor via `X-Bapi-Limit-Status` (remaining) and `X-Bapi-Limit-Reset-Timestamp` headers.

---

## 6. dYdX - indexer orderbook endpoint

| Detail | Value |
| --- | --- |
| Type | REST (GET) |
| Base URL | https://indexer.dydx.trade |
| Endpoint | GET /v4/orderbooks/perpetualMarket/{ticker} |
| Auth required | No |

Parameters (path):

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| ticker | string | Yes | Perpetual market, e.g. BTC-USD |

Example request (BTC perpetual):

```
GET https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/BTC-USD
```

Response includes bids and asks arrays with price and size.

Rate limits: 100 requests per 10-second window per IP (each GET = 1 point). Enforced via Redis-based rate limiter. Confirmed from `ratelimit-limit`, `ratelimit-remaining`, and `ratelimit-reset` response headers. Note: dYdX v4 is decentralized — different indexer operators may set different limits. The canonical indexer at `indexer.dydx.trade` uses these defaults.

---

## Quick-reference comparison table

| Exchange | Method | Example URL | Symbol format | Max depth | Auth |
| --- | --- | --- | --- | --- | --- |
| Hyperliquid | POST /info | https://api.hyperliquid.xyz/info (body: {"type":"l2Book","coin":"BTC"}) | Simple name (BTC) | 20 levels | No |
| Lighter | GET /api/v1/orderBookOrders (REST) or wss://…/stream (WS fallback) | https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=1&limit=250 | Numeric ID (1) | REST: 250 orders/side; WS: unlimited | No |
| AsterDEX | GET /fapi/v1/depth | https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=20 | Pair (BTCUSDT) | 1000 levels | No |
| Binance Futures | GET /fapi/v1/depth | https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000 | Pair (BTCUSDT) | 1000 levels | No |
| Bybit | GET /v5/market/orderbook | https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=1000 | Pair (BTCUSDT) + category | 1000 levels (docs say 500, actual 1000) | No |
| dYdX | GET /v4/orderbooks/perpetualMarket/{ticker} | https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/BTC-USD | Pair (BTC-USD) | Configurable | No |

---

## Rate Limits Reference (all exchanges)

| Exchange | Limit | Window | Orderbook Weight | Effective Orderbook Req/s | Basis | Violation Penalty |
| --- | --- | --- | --- | --- | --- | --- |
| Hyperliquid | 1,200 weight | 1 min | 2 per l2Book | ~10/s | IP | Throttled |
| Lighter (Documented) | 60w std / 24,000w prem | 1 min | 300 per orderBookOrders | Documented: ~0.2/s std | Account | Throttled |
| Lighter (Observed) | No throttling on anon GETs | N/A | N/A | 60+ concurrent OK | IP/CDN | None observed |
| AsterDEX | 2,400 weight | 1 min | 2 (≤50), 5 (100), 10 (500), 20 (1000) | ~20/s at limit=50 | IP | 429 → IP ban (2 min → 3 days) |
| Binance Futures | 2,400 weight | 1 min | 5 (≤50), 10 (100), 20 (500), 40 (1000) | ~8/s at limit=100 | IP | 429 → IP ban |
| Bybit | 600 req | 5 sec | 1 per request | ~120/s | IP | 10-min IP ban (403) |
| dYdX | 100 req | 10 sec | 1 per request | ~10/s | IP | Throttled |

### Monitoring headers

| Exchange | Header to monitor |
| --- | --- |
| Binance | `X-MBX-USED-WEIGHT-1m` |
| AsterDEX | `X-MBX-USED-WEIGHT-1m` (Binance-compatible) |
| Bybit | `X-Bapi-Limit-Status` (remaining), `X-Bapi-Limit-Reset-Timestamp` |
| dYdX | `ratelimit-remaining`, `ratelimit-reset` |
| Hyperliquid | None exposed in headers |
| Lighter | None exposed in headers |

### Scaling capacity (3 samples/min, per exchange)

How many pairs can we poll per minute at 3 fetches per pair?

| Pairs | Hyperliquid (1200w, wt=2) | dYdX (100r/10s) | Binance (2400w, wt=10) | Bybit (600r/5s) | Lighter Std (60w, wt=300) | AsterDEX (2400w, wt=5) |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 18w (2%) | 3r/burst (3%) | 90w (4%) | 9r/burst (2%) | No limit observed | 45w (2%) |
| 10 | 60w (5%) | 10r/burst (10%) | 300w (13%) | 30r/burst (5%) | No limit observed | 150w (6%) |
| 30 | 180w (15%) | 30r/burst (30%) | 900w (38%) | 90r/burst (15%) | No limit observed | 450w (19%) |
| 50 | 300w (25%) | 50r/burst (50%) | 1500w (63%) | 150r/burst (25%) | No limit observed | 750w (31%) |
| 80 | 480w (40%) | 80r/burst (80%) | 2400w (100%) | 240r/burst (40%) | No limit observed | 1200w (50%) |

**Bottleneck at scale:** Binance becomes the bottleneck above ~80 pairs (weight 10 per depth?limit=100 call). dYdX is second tightest.

**Lighter note:** Documented limits (wt=300 per orderBookOrders, 60w/min standard budget) suggest only 1 call per 5 min. However, empirical testing shows **no throttling on anonymous public GETs** — 60 concurrent requests all returned 200 OK in <1s. The documented weight limits likely apply to authenticated/account-level endpoints only. Public reads appear to be served via CloudFront CDN with no practical rate limit. Safe to poll at same frequency as other exchanges.

### Max parallel tickers (3 samples/min, 6 exchanges, 1-min medians)

| Exchange | Budget | Cost/call | Raw max tickers | Safe max (80%) |
| --- | --- | --- | --- | --- |
| Binance | 2,400w / min | 10w (limit=100) | 80 | **64** |
| dYdX | 100r / 10s | 1r | 100 | 80 |
| AsterDEX | 2,400w / min | 5w (limit=100) | 160 | 128 |
| Hyperliquid | 1,200w / min | 2w | 200 | 160 |
| Bybit | 600r / 5s | 1r | 600 | 480 |
| Lighter | No practical limit | N/A | Unlimited | Unlimited |

**Overall bottleneck: Binance at 64 tickers** (2,400w ÷ 10w per call ÷ 3 samples × 80% safety).

Staggering fetches across exchanges doesn't help here since Binance's limit is per-minute (not per-burst).

### Data volume at scale

| Tickers | Rows/day | MB/day | MB/month | Days to 1 GB (GitHub limit) |
| --- | --- | --- | --- | --- |
| 3 (current) | 25,920 | 5.2 | 156 | ~192 days (6 months) |
| 10 | 86,400 | 17.3 | 518 | ~57 days (2 months) |
| 30 | 259,200 | 51.8 | 1,555 | ~19 days |
| 64 (max) | 552,960 | 110.6 | 3,318 | ~9 days |

At 10+ tickers, consider a separate data repo or periodic archival (compress + delete old CSVs).

### Notes
- All limits are IP-based except Lighter (account-based)
- Lighter: documented limits are strict but empirically no throttling on public reads (CloudFront CDN)
- AsterDEX mirrors Binance API exactly (same weight system, same headers)
- Bybit has the most generous limits by far (600 req per 5s window)
- When scaling beyond 30 pairs, stagger fetches across exchanges to avoid burst conflicts

---

## Conclusion

Binance and AsterDEX share an identical interface, so one client implementation covers both. Bybit follows a similar GET-with-query-params pattern but adds the category dimension. Hyperliquid is the outlier, routing all info queries through a single POST /info endpoint and capping public depth at 20 levels. Lighter uses numeric market IDs, so you need a preliminary call to /api/v1/orderBooks to map tickers to IDs before querying depth. dYdX uses the indexer REST API. All endpoints above are public with no authentication required.

# compare-liquidity-ui implementation plan

## Summary
A standalone real-time web dashboard that fetches orderbook data from perpetual exchanges, computes slippage at various notional tiers, and visualizes comparisons with live bar charts. UI inspiration: https://www.ammchallenge.com/ (dark earthy tones, serif headings, monospace data).

## Tech stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Recharts
- React hooks for state (no external state library)

## Architecture
Data flow:
Browser polling (1.5s interval) -> Next.js API route /api/orderbook?exchange=X&ticker=Y -> exchange REST APIs -> raw JSON -> client parsing -> NormalizedBook -> computeSlippage -> LiquidityAnalysis -> charts

Why a CORS proxy:
Exchange APIs do not set permissive CORS headers. A thin Next.js API route fetches server-side and pipes raw JSON back. No transformation on the server; slippage math runs in the browser.

## Ticker mapping

| Canonical | Hyperliquid | dYdX | Lighter | AsterDEX | Binance | Bybit |
| --- | --- | --- | --- | --- | --- | --- |
| BTC | BTC | BTC-USD | BTC-USD | BTCUSDT | BTCUSDT | BTCUSDT |
| ETH | ETH | ETH-USD | ETH-USD | ETHUSDT | ETHUSDT | ETHUSDT |
| SOL | SOL | SOL-USD | SOL-USD | SOLUSDT | SOLUSDT | SOLUSDT |

Lighter uses numeric market IDs internally. The API route resolves symbol to market_id via GET /api/v1/orderBooks and caches the mapping for 5 minutes.

## Slippage computation
- 4 notional tiers: $1,000 / $10,000 / $100,000 / $1,000,000
- Walks the order book to compute VWAP for a given notional fill
- Slippage = distance from mid price to VWAP, in basis points
- Tracks whether the full notional was filled or only partial
- Reference implementation: compare-liquidity/src/hyperliquid.ts (lines 23-68)

## Exchange API details used by the UI
| Exchange | Method | Endpoint | Response shape |
| --- | --- | --- | --- |
| Hyperliquid | POST | https://api.hyperliquid.xyz/info body: {type:"l2Book",coin:"BTC"} | {levels: [[{px,sz,n}], [{px,sz,n}]]} |
| dYdX | GET | https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/{ticker} | {bids:[{price,size}], asks:[...]} |
| Lighter | GET | https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=N | {bids:[{price,remaining_base_amount}], asks:[...]} |
| AsterDEX | GET | https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=100 | {bids:[[price,qty]], asks:[[price,qty]]} |
| Binance | GET | https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000 | {bids:[[price,qty]], asks:[[price,qty]]} |
| Bybit | GET | https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=1000 | {result:{b:[[price,size]], a:[[price,size]]}} |

## Project structure

```
compare-liquidity-ui/
|-- package.json
|-- next.config.ts
|-- tailwind.config.ts
|-- postcss.config.mjs
|-- tsconfig.json
|-- src/
|   |-- app/
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- globals.css
|   |   `-- api/
|   |       `-- orderbook/
|   |           `-- route.ts
|   |-- lib/
|   |   |-- types.ts
|   |   |-- constants.ts
|   |   |-- slippage.ts
|   |   |-- format.ts
|   |   `-- exchanges/
|   |       |-- index.ts
|   |       |-- hyperliquid.ts
|   |       |-- dydx.ts
|   |       |-- lighter.ts
|   |       `-- asterdex.ts
|   |-- hooks/
|   |   `-- use-liquidity-poll.ts
|   `-- components/
|       |-- header.tsx
|       |-- ticker-selector.tsx
|       |-- dashboard.tsx
|       |-- spread-cards.tsx
|       |-- slippage-chart.tsx
|       |-- slippage-panel.tsx
|       |-- data-table.tsx
|       `-- pulse-dot.tsx
```

## Visual design

Color palette:

| Token | Value | Usage |
| --- | --- | --- |
| bg-primary | #1a1510 | Page background |
| bg-secondary | #241e17 | Panel background |
| bg-card | #2d251d | Card surfaces |
| border | #3d3329 | Subtle warm borders |
| text-primary | #e8e0d4 | Main text (warm off-white) |
| text-secondary | #a39685 | Labels, descriptions |
| text-muted | #6b5e50 | Axis labels, footnotes |
| accent | #a0522d | Primary accent (sienna) |

Exchange colors (UI defaults):
Hyperliquid: #a0522d
dYdX: #7c6fdb
Lighter: #4a9e7a
AsterDEX: #c88832
Binance: #f0b90b
Bybit: #5a67d8

Typography:
Crimson Pro (italic, 600-700) - headings, section titles
JetBrains Mono (400-500) - data: prices, bps, table cells
Inter - body text, labels, buttons

## Implementation steps
1. Phase 1: Scaffold - create Next.js project with TS + Tailwind + App Router, configure theme, install Recharts.
2. Phase 2: Core logic - types/constants, slippage engine, exchange parsers.
3. Phase 3: API layer - /api/orderbook route with Lighter market ID caching.
4. Phase 4: Polling hook - Promise.allSettled per exchange on 1.5s interval.
5. Phase 5: UI components - header, ticker selector, spread cards, charts, data table, dashboard.
6. Phase 6: Polish - responsive layout, loading states, error states, hover and pulse animations.

## Binance and Bybit addition plan
1. Add "binance" and "bybit" to ExchangeKey in src/lib/types.ts.
2. Extend EXCHANGES, EXCHANGE_LABELS, EXCHANGE_COLORS, and TICKER_MAP in src/lib/constants.ts.
3. Add src/lib/exchanges/binance.ts and src/lib/exchanges/bybit.ts parsers.
4. Register new parsers in src/lib/exchanges/index.ts.
5. Extend src/app/api/orderbook/route.ts with upstream URL builders. Binance: https://fapi.binance.com/fapi/v1/depth?symbol={symbol}&limit=1000. Bybit: https://api.bybit.com/v5/market/orderbook?category=linear&symbol={symbol}&limit=1000.
6. Optional UI tweak: consider grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 for 6 cards.

## Considerations
- Rate limits: Binance (2,400 weight per minute) and Bybit (120 requests per minute on public) are sufficient for 1.5s polling.
- CORS: Both APIs block browser requests; the Next.js proxy handles this.
- Bybit depth limit: docs say 500, but API actually returns up to 1,000 levels. Using 1,000.
- Hyperliquid depth: public l2Book snapshot caps at 20 levels.

## Verification
1. npm run dev - site loads at http://localhost:3000
2. Default BTC ticker shows data from all exchanges updating live.
3. Bar charts refresh every ~1.5 seconds.
4. Switch ticker to ETH or SOL and confirm data refresh.
5. If one exchange errors, the others continue.
6. Spread cards show accurate mid price, spread in bps, and green pulse dots.

## Reference files (from existing project)
- ../compare-liquidity/src/types.ts
- ../compare-liquidity/src/hyperliquid.ts (lines 23-68)
- ../compare-liquidity/src/lighter.ts (lines 48-56)
- ../compare-liquidity/src/lighter.ts (lines 17-39)
