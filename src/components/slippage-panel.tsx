"use client";

import type { ExchangeRecord, ExchangeStatus, SpreadUnit, TickerKey } from "@/lib/types";
import { SlippageChart } from "./slippage-chart";
import { SpreadCompareChart } from "./spread-compare-chart";

interface SlippagePanelProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  ticker: TickerKey;
  spreadUnit: SpreadUnit;
}

export function SlippagePanel({ statuses, ticker, spreadUnit }: SlippagePanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="panel xl:col-span-2">
        <div className="mb-4 space-y-1">
          <p className="label">Spread monitor</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{ticker} Live Spread Comparison</h3>
        </div>
        <SpreadCompareChart statuses={statuses} spreadUnit={spreadUnit} />
      </article>

      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Buying pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{ticker} Ask Slippage Curve</h3>
        </div>
        <SlippageChart side="ask" statuses={statuses} spreadUnit={spreadUnit} />
      </article>

      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Selling pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{ticker} Bid Slippage Curve</h3>
        </div>
        <SlippageChart side="bid" statuses={statuses} spreadUnit={spreadUnit} />
      </article>
    </section>
  );
}
