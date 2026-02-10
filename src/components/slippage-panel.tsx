"use client";

import type { ExchangeRecord, ExchangeStatus } from "@/lib/types";
import { SlippageChart } from "./slippage-chart";

interface SlippagePanelProps {
  statuses: ExchangeRecord<ExchangeStatus>;
}

export function SlippagePanel({ statuses }: SlippagePanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Buying pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Ask Slippage Curve</h3>
        </div>
        <SlippageChart side="ask" statuses={statuses} />
      </article>

      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Selling pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Bid Slippage Curve</h3>
        </div>
        <SlippageChart side="bid" statuses={statuses} />
      </article>
    </section>
  );
}
