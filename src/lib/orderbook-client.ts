import { TICKER_MAP } from "./constants";
import type { ExchangeKey, TickerKey } from "./types";

const HYPERLIQUID_URL = "https://api.hyperliquid.xyz/info";
const DYDX_BASE_URL = "https://indexer.dydx.trade/v4";
const LIGHTER_BASE_URL = "https://mainnet.zklighter.elliot.ai/api/v1";
const ASTERDEX_BASE_URL = "https://fapi.asterdex.com";
const BINANCE_BASE_URL = "https://fapi.binance.com";
const BYBIT_BASE_URL = "https://api.bybit.com";
const LIGHTER_CACHE_MS = 5 * 60 * 1000;

const PROXY_PREFIX = process.env.NEXT_PUBLIC_HTTP_PROXY_PREFIX ?? "";

type LighterMarketsResponse = {
  order_books?: Array<{
    symbol: string;
    market_id: number;
  }>;
};

let lighterMarketCache:
  | {
      expiresAt: number;
      bySymbol: Record<string, number>;
    }
  | null = null;

function withProxy(url: string): string {
  if (!PROXY_PREFIX) return url;
  return `${PROXY_PREFIX}${encodeURIComponent(url)}`;
}

async function requestJson<T = unknown>(url: string, init?: RequestInit, retries = 1): Promise<T> {
  const response = await fetch(withProxy(url), {
    ...(init ?? {}),
    cache: "no-store",
  });

  if (!response.ok) {
    const canRetry = retries > 0 && (response.status === 429 || response.status >= 500);
    if (canRetry) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return requestJson<T>(url, init, retries - 1);
    }

    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return (await response.json()) as T;
}

async function refreshLighterMarketCache(): Promise<void> {
  const payload = await requestJson<LighterMarketsResponse>(`${LIGHTER_BASE_URL}/orderBooks`);

  if (!payload.order_books || !Array.isArray(payload.order_books)) {
    throw new Error("Lighter market list is malformed");
  }

  const bySymbol: Record<string, number> = {};
  for (const market of payload.order_books) {
    const symbol = market.symbol?.toUpperCase();
    if (!symbol || typeof market.market_id !== "number") continue;
    bySymbol[symbol] = market.market_id;
  }

  lighterMarketCache = {
    expiresAt: Date.now() + LIGHTER_CACHE_MS,
    bySymbol,
  };
}

async function resolveLighterMarketId(symbol: string): Promise<number> {
  if (!lighterMarketCache || lighterMarketCache.expiresAt < Date.now()) {
    await refreshLighterMarketCache();
  }

  const marketId = lighterMarketCache?.bySymbol[symbol.toUpperCase()];
  if (typeof marketId !== "number") {
    throw new Error(`Unknown Lighter market symbol: ${symbol}`);
  }

  return marketId;
}

export async function fetchOrderbookRaw(exchange: ExchangeKey, ticker: TickerKey): Promise<unknown> {
  const symbol = TICKER_MAP[ticker][exchange];

  switch (exchange) {
    case "hyperliquid":
      return requestJson(HYPERLIQUID_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "l2Book",
          coin: symbol,
          nSigFigs: 5,
          mantissa: 1,
        }),
      });
    case "dydx":
      return requestJson(`${DYDX_BASE_URL}/orderbooks/perpetualMarket/${encodeURIComponent(symbol)}`);
    case "lighter": {
      const marketId = await resolveLighterMarketId(symbol);
      return requestJson(`${LIGHTER_BASE_URL}/orderBookOrders?market_id=${marketId}&limit=250`);
    }
    case "asterdex":
      return requestJson(`${ASTERDEX_BASE_URL}/fapi/v1/depth?symbol=${encodeURIComponent(symbol)}&limit=1000`);
    case "binance":
      return requestJson(`${BINANCE_BASE_URL}/fapi/v1/depth?symbol=${encodeURIComponent(symbol)}&limit=1000`);
    case "bybit":
      return requestJson(`${BYBIT_BASE_URL}/v5/market/orderbook?category=linear&symbol=${encodeURIComponent(symbol)}&limit=500`);
    default:
      throw new Error(`Unsupported exchange: ${String(exchange)}`);
  }
}
