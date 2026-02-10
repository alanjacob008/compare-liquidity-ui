# Orderbook API endpoints for five perpetual futures exchanges

**Every major perpetual futures exchange exposes a public, unauthenticated REST endpoint for fetching orderbook snapshots** — though the interface styles vary significantly. Binance, AsterDEX, and Bybit use conventional `GET` requests with query parameters, Hyperliquid uses a `POST`-based RPC pattern, and Lighter uses numeric market IDs instead of ticker symbols. Below is the exact endpoint, parameter set, and example call for each.

---

## 1. Hyperliquid — POST-based RPC on a single `/info` route

Hyperliquid consolidates all public queries behind a single `POST /info` endpoint. The request body's `type` field determines what data you receive.

| Detail | Value |
|---|---|
| **Type** | REST (POST) |
| **Base URL** | `https://api.hyperliquid.xyz` |
| **Endpoint** | `POST /info` |
| **Content-Type** | `application/json` |
| **Auth required** | No |

**Parameters** (JSON body):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Must be `"l2Book"` |
| `coin` | string | Yes | Asset ticker, e.g. `"BTC"`, `"ETH"`, `"SOL"` |
| `nSigFigs` | int | No | Aggregate levels to N significant figures. Valid: `2`, `3`, `4`, `5` |
| `mantissa` | int | No | Further aggregation (only when `nSigFigs` = 5). Valid: `1`, `2`, `5` |

**Example request (BTC perpetual):**
```bash
curl -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "l2Book", "coin": "BTC"}'
```

The response returns **up to 20 levels per side** in a `levels` array where `levels[0]` = bids (descending price) and `levels[1]` = asks (ascending price). Each level includes `px` (price), `sz` (size), and `n` (order count).

**Rate limits:** **1,200 weighted requests per minute per IP**. The `l2Book` request costs only **weight 2**, so you can poll roughly 600 times/minute.

---

## 2. Lighter — numeric market IDs via REST GET

Lighter identifies markets by integer index rather than ticker symbol. **Market index 0 is ETH-USD and index 1 is likely BTC-USD** — confirm by calling `GET /api/v1/orderBooks` to discover all available markets.

| Detail | Value |
|---|---|
| **Type** | REST (GET) |
| **Base URL** | `https://mainnet.zklighter.elliot.ai` |
| **Endpoint** | `GET /api/v1/orderBookOrders` |
| **Auth required** | No |

**Parameters** (query string):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `market_id` | int | Yes | Numeric market identifier (e.g., `1` for BTC-USD) |
| `limit` | int | No | Number of levels to return |

**Example request (BTC perpetual):**
```
GET https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=1
```

The response contains `bids` and `asks` arrays, each with `price` and `size` strings. A companion endpoint `GET /api/v1/orderBooks` returns metadata for all markets (fees, decimals, min amounts) and is useful for discovering market IDs.

**Rate limits:** Standard accounts get **60 requests per minute**; premium accounts get **24,000 weighted requests per minute**. The `orderBookOrders` endpoint has a **weight of 300**.

---

## 3. AsterDEX — Binance-compatible `/fapi/v1/depth` interface

AsterDEX mirrors the Binance Futures API structure almost exactly, making integration trivial if you already support Binance.

| Detail | Value |
|---|---|
| **Type** | REST (GET) |
| **Base URL** | `https://fapi.asterdex.com` |
| **Endpoint** | `GET /fapi/v1/depth` |
| **Auth required** | No |

**Parameters** (query string):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Trading pair, e.g. `BTCUSDT` |
| `limit` | int | No | Default **500**. Valid: `5`, `10`, `20`, `50`, `100`, `500`, `1000` |

**Example request (BTC perpetual, 20 levels):**
```
GET https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=20
```

The response includes `bids` and `asks` as arrays of `[price, quantity]` pairs, plus `lastUpdateId`, `E` (message output time), and `T` (transaction time). **The weight scales with depth:** 2 for ≤50 levels, 5 for 100, 10 for 500, and 20 for 1000.

**Rate limits:** **2,400 weight per minute per IP**. Exceeding this returns HTTP 429; repeat offenders face auto-bans escalating from 2 minutes to 3 days.

---

## 4. Binance USDS-Margined Futures — the `/fapi/v1/depth` standard

Binance's USDS-M Futures orderbook endpoint is likely the most widely integrated in the industry. AsterDEX's API is essentially a clone of this interface.

| Detail | Value |
|---|---|
| **Type** | REST (GET) |
| **Base URL** | `https://fapi.binance.com` |
| **Endpoint** | `GET /fapi/v1/depth` |
| **Auth required** | No |

**Parameters** (query string):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Trading pair, e.g. `BTCUSDT` |
| `limit` | int | No | Default **500**. Valid: `5`, `10`, `20`, `50`, `100`, `500`, `1000` |

**Example request (BTC/USDT perpetual, full depth):**
```
GET https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000
```

Response structure is identical to AsterDEX: `bids` and `asks` as `[price, qty]` arrays with `lastUpdateId`. **Weight by depth** is the same scale: 2 / 5 / 10 / 20. Note that Retail Price Improvement (RPI) orders are excluded from the response.

**Rate limits:** **2,400 weight per minute per IP**. Monitor usage via the `X-MBX-USED-WEIGHT-1m` response header.

---

## 5. Bybit V5 — category-aware `GET /v5/market/orderbook`

Bybit's V5 API uses a unified endpoint across all product types, distinguished by the `category` parameter. For USDT or USDC perpetual contracts, use `category=linear`.

| Detail | Value |
|---|---|
| **Type** | REST (GET) |
| **Base URL** | `https://api.bybit.com` |
| **Endpoint** | `GET /v5/market/orderbook` |
| **Auth required** | No |

**Parameters** (query string):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | Product type: `linear`, `inverse`, `spot`, or `option` |
| `symbol` | string | Yes | Symbol in uppercase, e.g. `BTCUSDT` |
| `limit` | int | No | Levels per side. For `linear`/`inverse`: **1–500** (default 25). For `spot`: 1–200. For `option`: 1–25 |

**Example request (BTC/USDT linear perpetual, 50 levels):**
```
GET https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=50
```

The response nests data under `result` with `b` (bids, descending) and `a` (asks, ascending) as `[price, size]` arrays. It also includes `u` (update ID), `seq` (cross-sequence for ordering), and `cts` (matching-engine timestamp).

**Rate limits:** **600 requests per 5-second window per IP** (~120 req/s) across all endpoints. Exceeding this triggers a 10-minute IP ban with a 403 response.

---

## Quick-reference comparison table

| Exchange | Method | Example URL | Symbol Format | Max Depth | Auth |
|----------|--------|------------|---------------|-----------|------|
| **Hyperliquid** | `POST /info` | `https://api.hyperliquid.xyz/info` (body: `{"type":"l2Book","coin":"BTC"}`) | Simple name (`BTC`) | 20 levels | No |
| **Lighter** | `GET /api/v1/orderBookOrders` | `https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=1` | Numeric ID (`1`) | Configurable | No |
| **AsterDEX** | `GET /fapi/v1/depth` | `https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=20` | Pair (`BTCUSDT`) | 1000 levels | No |
| **Binance Futures** | `GET /fapi/v1/depth` | `https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000` | Pair (`BTCUSDT`) | 1000 levels | No |
| **Bybit** | `GET /v5/market/orderbook` | `https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=50` | Pair (`BTCUSDT`) + category | 500 levels | No |

## Conclusion

Three distinct API patterns emerge across these five exchanges. **Binance and AsterDEX share an identical interface** — same path (`/fapi/v1/depth`), same parameters, same response shape — so a single client implementation covers both. Bybit follows a similar GET-with-query-params pattern but adds the `category` dimension for its unified V5 API. **Hyperliquid is the outlier**, routing all info queries through a single `POST /info` endpoint with type-dispatched JSON bodies and capping public depth at just 20 levels (far fewer than the 500–1000 levels available on CEXs). Lighter is the only exchange that uses **numeric market IDs** instead of human-readable symbols, so you'll need a preliminary call to `GET /api/v1/orderBooks` to map tickers to IDs before querying depth. All five endpoints are fully public with no authentication required.˘˘