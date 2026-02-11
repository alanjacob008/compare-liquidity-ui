"use client";

import { EXCHANGES, EXCHANGE_LABELS } from "@/lib/constants";
import type { ExchangeRecord, ExchangeStatus, TickerKey } from "@/lib/types";
import { DataTable } from "./data-table";
import { PulseDot } from "./pulse-dot";
import { SlippagePanel } from "./slippage-panel";
import { SpreadCards } from "./spread-cards";

interface DashboardProps {
  ticker: TickerKey;
  statuses: ExchangeRecord<ExchangeStatus>;
  lastRefreshAt: number | null;
}

export function Dashboard({ ticker, statuses, lastRefreshAt }: DashboardProps) {
  const failedExchanges = EXCHANGES.filter((exchange) => Boolean(statuses[exchange].error));

  return (
    <section className="space-y-5">
      <div className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="label">Market Overview</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{ticker} Perpetual Liquidity</h3>
          <p className="text-sm text-[var(--text-secondary)]">Spread and execution depth for six venues, refreshed every 1.5s.</p>
        </div>
        <PulseDot timestamp={lastRefreshAt} />
      </div>

      {failedExchanges.length > 0 ? (
        <div className="panel border-[color:rgba(255,111,124,0.5)] text-sm text-[var(--text-secondary)]">
          Some venues are currently unavailable: {failedExchanges.map((exchange) => EXCHANGE_LABELS[exchange]).join(", ")}.
        </div>
      ) : null}

      <SpreadCards statuses={statuses} />
      <SlippagePanel statuses={statuses} />
      <DataTable statuses={statuses} />
    </section>
  );
}
