"use client";

import { Fragment } from "react";
import { EXCHANGES, EXCHANGE_LABELS, NOTIONAL_TIERS } from "@/lib/constants";
import { formatTier, formatUsd } from "@/lib/format";
import type { ExchangeRecord, ExchangeStatus, SlippageResult } from "@/lib/types";

interface DataTableProps {
  statuses: ExchangeRecord<ExchangeStatus>;
}

function renderCell(point: SlippageResult | undefined): string {
  if (!point) return "--";

  const base = `${point.slippageBps.toFixed(2)} bps`;
  if (point.filled) return base;
  return `${base} (partial ${formatUsd(point.filledNotional, true)})`;
}

export function DataTable({ statuses }: DataTableProps) {
  return (
    <section className="panel">
      <div className="mb-4 space-y-1">
        <p className="label">Detailed analytics</p>
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Slippage Breakdown</h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-[color:rgba(79,140,255,0.08)]">
            <tr className="border-b border-[color:var(--border)]">
              <th rowSpan={2} className="px-3 py-3 font-medium text-[var(--text-secondary)]">Exchange</th>
              {NOTIONAL_TIERS.map((tier) => (
                <th key={`group-${tier}`} colSpan={2} className="px-3 py-3 text-center font-medium text-[var(--text-secondary)]">
                  {formatTier(tier)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-[color:var(--border)]">
              {NOTIONAL_TIERS.map((tier) => (
                <Fragment key={`sub-${tier}`}>
                  <th className="px-3 py-2 text-center font-medium text-[var(--text-muted)]">Bid</th>
                  <th className="px-3 py-2 text-center font-medium text-[var(--text-muted)]">Ask</th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {EXCHANGES.map((exchange) => {
              const analysis = statuses[exchange].analysis;

              return (
                <tr key={exchange} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--text-primary)]">{EXCHANGE_LABELS[exchange]}</p>
                      {statuses[exchange].error ? <p className="text-xs text-[var(--danger)]">{statuses[exchange].error}</p> : null}
                    </div>
                  </td>

                  {NOTIONAL_TIERS.map((tier, idx) => {
                    const bidPoint = analysis?.bids[idx];
                    const askPoint = analysis?.asks[idx];

                    return (
                      <Fragment key={`${exchange}-${tier}`}>
                        <td className={`data-mono px-3 py-3 text-center ${bidPoint && !bidPoint.filled ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}>
                          {renderCell(bidPoint)}
                        </td>
                        <td className={`data-mono px-3 py-3 text-center ${askPoint && !askPoint.filled ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}>
                          {renderCell(askPoint)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Amber cells indicate partial fills where available depth could not satisfy the full target notional.
      </p>
    </section>
  );
}
