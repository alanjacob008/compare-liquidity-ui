"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXCHANGES, POLL_INTERVAL_MS } from "@/lib/constants";
import { EXCHANGE_REGISTRY } from "@/lib/exchanges";
import { fetchOrderbookRaw } from "@/lib/orderbook-client";
import { analyzeBook } from "@/lib/slippage";
import type { ExchangeKey, ExchangeRecord, ExchangeStatus, LiquidityAnalysis, TickerKey } from "@/lib/types";

function createInitialStatuses(): ExchangeRecord<ExchangeStatus> {
  return EXCHANGES.reduce(
    (acc, exchange) => {
      acc[exchange] = {
        exchange,
        loading: true,
        error: null,
        lastUpdated: null,
        analysis: null,
      };
      return acc;
    },
    {} as ExchangeRecord<ExchangeStatus>
  );
}

type PollOutcome = {
  exchange: ExchangeKey;
  analysis: LiquidityAnalysis;
};

function hasPartialFill(analysis: LiquidityAnalysis): boolean {
  return [...analysis.bids, ...analysis.asks].some((point) => !point.filled);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown polling error";
}

export function useLiquidityPoll(ticker: TickerKey): {
  statuses: ExchangeRecord<ExchangeStatus>;
  lastRefreshAt: number | null;
  hasData: boolean;
  isLoading: boolean;
} {
  const [statuses, setStatuses] = useState<ExchangeRecord<ExchangeStatus>>(() => createInitialStatuses());
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setStatuses(createInitialStatuses());
    setLastRefreshAt(null);
  }, [ticker]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setStatuses((prev) => {
        const next = { ...prev };
        for (const exchange of EXCHANGES) {
          next[exchange] = {
            ...next[exchange],
            loading: true,
          };
        }
        return next;
      });

      const settled = await Promise.allSettled(
        EXCHANGES.map(async (exchange): Promise<PollOutcome> => {
          if (exchange !== "hyperliquid") {
            const raw = await fetchOrderbookRaw(exchange, ticker);
            const book = EXCHANGE_REGISTRY[exchange].parse(raw);
            const analysis = analyzeBook({ ticker, exchange, book });
            return { exchange, analysis };
          }

          const rawFine = await fetchOrderbookRaw(exchange, ticker, {
            hyperliquid: { nSigFigs: 5 },
          });
          const fineBook = EXCHANGE_REGISTRY[exchange].parse(rawFine);
          const fineAnalysis = analyzeBook({
            ticker,
            exchange,
            book: fineBook,
            meta: {
              isAggregatedEstimate: false,
              hyperliquidNSigFigs: 5,
            },
          });

          if (!hasPartialFill(fineAnalysis)) {
            return { exchange, analysis: fineAnalysis };
          }

          try {
            const rawCoarse = await fetchOrderbookRaw(exchange, ticker, {
              hyperliquid: { nSigFigs: 4 },
            });
            const coarseBook = EXCHANGE_REGISTRY[exchange].parse(rawCoarse);
            const coarseAnalysis = analyzeBook({
              ticker,
              exchange,
              book: coarseBook,
              meta: {
                isAggregatedEstimate: true,
                hyperliquidNSigFigs: 4,
              },
            });

            return { exchange, analysis: coarseAnalysis };
          } catch {
            // Graceful fallback: keep fine-grained snapshot if coarser request fails.
            return { exchange, analysis: fineAnalysis };
          }
        })
      );

      if (!active) {
        inFlightRef.current = false;
        return;
      }

      const now = Date.now();
      setStatuses((prev) => {
        const next = { ...prev };

        settled.forEach((result, index) => {
          const exchange = EXCHANGES[index];

          if (result.status === "fulfilled") {
            const { analysis } = result.value;
            next[exchange] = {
              exchange,
              loading: false,
              error: null,
              lastUpdated: analysis.timestamp || now,
              analysis,
            };
            return;
          }

          next[exchange] = {
            ...prev[exchange],
            loading: false,
            error: formatError(result.reason),
          };
        });

        return next;
      });

      setLastRefreshAt(now);
      inFlightRef.current = false;
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ticker]);

  const hasData = useMemo(
    () => EXCHANGES.some((exchange) => Boolean(statuses[exchange].analysis)),
    [statuses]
  );

  const isLoading = useMemo(
    () => EXCHANGES.every((exchange) => statuses[exchange].loading && !statuses[exchange].analysis),
    [statuses]
  );

  return {
    statuses,
    lastRefreshAt,
    hasData,
    isLoading,
  };
}
