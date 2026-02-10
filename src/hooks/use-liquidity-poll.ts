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
          const raw = await fetchOrderbookRaw(exchange, ticker);
          const book = EXCHANGE_REGISTRY[exchange].parse(raw);
          const analysis = analyzeBook({ ticker, exchange, book });
          return { exchange, analysis };
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
