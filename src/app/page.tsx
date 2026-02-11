"use client";

import { useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { TickerSelector } from "@/components/ticker-selector";
import { useLiquidityPoll } from "@/hooks/use-liquidity-poll";
import type { TickerKey } from "@/lib/types";

export default function HomePage() {
  const [ticker, setTicker] = useState<TickerKey>("BTC");
  const { statuses, lastRefreshAt, hasData, isLoading } = useLiquidityPoll(ticker);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Header />

        <section className="panel relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="label">Live comparison console</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">{ticker} Liquidity Dashboard</h2>
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
              Monitoring Hyperliquid, dYdX, Lighter, AsterDEX, Binance, and Bybit in near real time.
            </p>
          </div>
          <TickerSelector value={ticker} onChange={setTicker} />
        </section>

        {isLoading && !hasData ? (
          <section className="panel faint-grid min-h-56 animate-pulse">
            <p className="label">Loading market depth</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Fetching initial order books and computing slippage tiers.</p>
          </section>
        ) : (
          <Dashboard ticker={ticker} statuses={statuses} lastRefreshAt={lastRefreshAt} />
        )}
      </div>
    </main>
  );
}
