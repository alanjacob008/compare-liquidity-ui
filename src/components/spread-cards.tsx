"use client";

import { EXCHANGES, EXCHANGE_COLORS, EXCHANGE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { ExchangeRecord, ExchangeStatus, SpreadUnit, TickerKey } from "@/lib/types";
import { PulseDot } from "./pulse-dot";

interface SpreadCardsProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  ticker: TickerKey;
  spreadUnit: SpreadUnit;
}

function formatSpread(bps: number, unit: SpreadUnit): string {
  if (!Number.isFinite(bps)) return "--";
  if (unit === "pct") return `${(bps / 100).toFixed(4)}%`;
  return `${bps.toFixed(2)} bps`;
}

export function SpreadCards({ statuses, ticker, spreadUnit }: SpreadCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {EXCHANGES.map((exchange) => {
        const status = statuses[exchange];
        const analysis = status.analysis;

        return (
          <article key={exchange} className="card-surface overflow-hidden" style={{ borderColor: `${EXCHANGE_COLORS[exchange]}66` }}>
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${EXCHANGE_COLORS[exchange]} 0%, transparent 100%)` }} />

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{EXCHANGE_LABELS[exchange]}</h3>
                  <span className="data-mono text-xs text-[var(--text-muted)]">{ticker}-PERP</span>
                </div>
                <PulseDot timestamp={status.lastUpdated} />
              </div>

              {analysis ? (
                <div className="data-mono grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                  <div>
                    <p className="label">Mid</p>
                    <p className="mt-1 text-[var(--text-primary)]">{formatPrice(analysis.midPrice)}</p>
                  </div>
                  <div>
                    <p className="label">Spread</p>
                    <p className="mt-1 text-[var(--text-primary)]">{formatSpread(analysis.spreadBps, spreadUnit)}</p>
                  </div>
                  <div>
                    <p className="label">Best Bid</p>
                    <p className="mt-1 text-[var(--text-primary)]">{formatPrice(analysis.bestBid)}</p>
                  </div>
                  <div>
                    <p className="label">Best Ask</p>
                    <p className="mt-1 text-[var(--text-primary)]">{formatPrice(analysis.bestAsk)}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                  <p>{status.loading ? "Fetching order book..." : "No data available."}</p>
                </div>
              )}

              {status.error ? <p className="text-xs text-[var(--danger)]">{status.error}</p> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
