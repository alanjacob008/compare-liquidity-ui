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
          <p className="label">Buying</p>
          <h3 className="font-display text-2xl italic text-[var(--text-primary)]">Ask Slippage</h3>
        </div>
        <SlippageChart side="ask" statuses={statuses} />
      </article>

      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Selling</p>
          <h3 className="font-display text-2xl italic text-[var(--text-primary)]">Bid Slippage</h3>
        </div>
        <SlippageChart side="bid" statuses={statuses} />
      </article>
    </section>
  );
}
