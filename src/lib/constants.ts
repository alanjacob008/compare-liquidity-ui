import type { ExchangeKey, ExchangeRecord, TickerKey } from "./types";

export const NOTIONAL_TIERS = [1_000, 10_000, 100_000, 1_000_000] as const;
export const POLL_INTERVAL_MS = 1_500;

export const EXCHANGES: ExchangeKey[] = ["hyperliquid", "dydx", "lighter", "asterdex", "binance", "bybit"];
export const TICKERS: TickerKey[] = ["BTC", "ETH", "SOL"];

export const EXCHANGE_LABELS: ExchangeRecord<string> = {
  hyperliquid: "Hyperliquid",
  dydx: "dYdX",
  lighter: "Lighter",
  asterdex: "AsterDEX",
  binance: "Binance",
  bybit: "Bybit",
};

export const EXCHANGE_COLORS: ExchangeRecord<string> = {
  hyperliquid: "#a0522d",
  dydx: "#7c6fdb",
  lighter: "#4a9e7a",
  asterdex: "#c88832",
  binance: "#f0b90b",
  bybit: "#f7a600",
};

export const TICKER_MAP: Record<TickerKey, ExchangeRecord<string>> = {
  BTC: {
    hyperliquid: "BTC",
    dydx: "BTC-USD",
    lighter: "BTC",
    asterdex: "BTCUSDT",
    binance: "BTCUSDT",
    bybit: "BTCUSDT",
  },
  ETH: {
    hyperliquid: "ETH",
    dydx: "ETH-USD",
    lighter: "ETH",
    asterdex: "ETHUSDT",
    binance: "ETHUSDT",
    bybit: "ETHUSDT",
  },
  SOL: {
    hyperliquid: "SOL",
    dydx: "SOL-USD",
    lighter: "SOL",
    asterdex: "SOLUSDT",
    binance: "SOLUSDT",
    bybit: "SOLUSDT",
  },
};

export function isExchangeKey(value: string): value is ExchangeKey {
  return EXCHANGES.includes(value as ExchangeKey);
}

export function isTickerKey(value: string): value is TickerKey {
  return TICKERS.includes(value as TickerKey);
}
