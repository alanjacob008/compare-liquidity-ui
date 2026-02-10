import { EXCHANGE_COLORS, EXCHANGE_LABELS } from "../constants";
import type { ExchangeKey, ExchangeRecord, NormalizedBook } from "../types";
import { parseAsterdexBook } from "./asterdex";
import { parseBinanceBook } from "./binance";
import { parseBybitBook } from "./bybit";
import { parseDydxBook } from "./dydx";
import { parseHyperliquidBook } from "./hyperliquid";
import { parseLighterBook } from "./lighter";

export type BookParser = (raw: unknown) => NormalizedBook;

export interface ExchangeDescriptor {
  key: ExchangeKey;
  name: string;
  color: string;
  parse: BookParser;
}

export const EXCHANGE_REGISTRY: ExchangeRecord<ExchangeDescriptor> = {
  hyperliquid: {
    key: "hyperliquid",
    name: EXCHANGE_LABELS.hyperliquid,
    color: EXCHANGE_COLORS.hyperliquid,
    parse: parseHyperliquidBook,
  },
  dydx: {
    key: "dydx",
    name: EXCHANGE_LABELS.dydx,
    color: EXCHANGE_COLORS.dydx,
    parse: parseDydxBook,
  },
  lighter: {
    key: "lighter",
    name: EXCHANGE_LABELS.lighter,
    color: EXCHANGE_COLORS.lighter,
    parse: parseLighterBook,
  },
  asterdex: {
    key: "asterdex",
    name: EXCHANGE_LABELS.asterdex,
    color: EXCHANGE_COLORS.asterdex,
    parse: parseAsterdexBook,
  },
  binance: {
    key: "binance",
    name: EXCHANGE_LABELS.binance,
    color: EXCHANGE_COLORS.binance,
    parse: parseBinanceBook,
  },
  bybit: {
    key: "bybit",
    name: EXCHANGE_LABELS.bybit,
    color: EXCHANGE_COLORS.bybit,
    parse: parseBybitBook,
  },
};
