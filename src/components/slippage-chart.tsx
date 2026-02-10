"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EXCHANGES, EXCHANGE_COLORS, EXCHANGE_LABELS, NOTIONAL_TIERS } from "@/lib/constants";
import { formatTier } from "@/lib/format";
import type { ExchangeKey, ExchangeRecord, ExchangeStatus } from "@/lib/types";

interface SlippageChartProps {
  side: "ask" | "bid";
  statuses: ExchangeRecord<ExchangeStatus>;
}

type ChartDatum = {
  tier: string;
} & Partial<Record<ExchangeKey, number | null>>;

export function SlippageChart({ side, statuses }: SlippageChartProps) {
  const data: ChartDatum[] = NOTIONAL_TIERS.map((tier, idx) => {
    const row: ChartDatum = {
      tier: formatTier(tier),
    };

    for (const exchange of EXCHANGES) {
      const analysis = statuses[exchange].analysis;
      const point = side === "ask" ? analysis?.asks[idx] : analysis?.bids[idx];
      row[exchange] = point ? Number(point.slippageBps.toFixed(2)) : null;
    }

    return row;
  });

  const hasData = data.some((row) => EXCHANGES.some((exchange) => typeof row[exchange] === "number"));

  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        Waiting for enough order book data to render chart.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 12, top: 6, bottom: 6 }} barGap={2}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(186, 213, 255, 0.12)" />
          <XAxis
            dataKey="tier"
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
          />
          <YAxis
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "rgba(79, 140, 255, 0.12)" }}
            contentStyle={{
              background: "#101c32",
              border: "1px solid rgba(141, 168, 213, 0.35)",
              borderRadius: "0.6rem",
              boxShadow: "0 12px 28px rgba(2, 8, 20, 0.6)",
            }}
            formatter={(value: number | string, name: string) => {
              const numeric = typeof value === "number" ? value : Number(value);
              return [`${numeric.toFixed(2)} bps`, EXCHANGE_LABELS[name as ExchangeKey]];
            }}
          />
          <Legend wrapperStyle={{ color: "#9fb0d1", fontSize: "12px" }} />

          {EXCHANGES.map((exchange) => (
            <Bar
              key={exchange}
              dataKey={exchange}
              name={EXCHANGE_LABELS[exchange]}
              fill={EXCHANGE_COLORS[exchange]}
              radius={[4, 4, 0, 0]}
              minPointSize={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
