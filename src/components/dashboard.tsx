"use client";

import { useState } from "react";
import { EXCHANGES, EXCHANGE_LABELS } from "@/lib/constants";
import type { ExchangeRecord, ExchangeStatus, SpreadUnit, TickerKey } from "@/lib/types";
import { DataTable } from "./data-table";
import { SlippagePanel } from "./slippage-panel";
import { SpreadCards } from "./spread-cards";

interface DashboardProps {
  ticker: TickerKey;
  statuses: ExchangeRecord<ExchangeStatus>;
  lastRefreshAt: number | null;
}

export function Dashboard({ ticker, statuses, lastRefreshAt }: DashboardProps) {
  const [spreadUnit, setSpreadUnit] = useState<SpreadUnit>("bps");
  const failedExchanges = EXCHANGES.filter((exchange) => Boolean(statuses[exchange].error));

  return (
    <section className="space-y-5">
      {failedExchanges.length > 0 ? (
        <div className="panel border-[color:rgba(255,111,124,0.5)] text-sm text-[var(--text-secondary)]">
          Some venues are currently unavailable: {failedExchanges.map((exchange) => EXCHANGE_LABELS[exchange]).join(", ")}.
        </div>
      ) : null}

      <SpreadCards statuses={statuses} ticker={ticker} spreadUnit={spreadUnit} />
      <SlippagePanel statuses={statuses} ticker={ticker} spreadUnit={spreadUnit} />
      <DataTable
        statuses={statuses}
        ticker={ticker}
        lastRefreshAt={lastRefreshAt}
        spreadUnit={spreadUnit}
        onToggleUnit={() => setSpreadUnit((u) => (u === "bps" ? "pct" : "bps"))}
      />
    </section>
  );
}
