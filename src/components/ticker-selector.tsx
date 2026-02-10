"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXCHANGES, EXCHANGE_LABELS, TICKERS, TICKER_MAP } from "@/lib/constants";
import type { TickerKey } from "@/lib/types";

interface TickerSelectorProps {
  value: TickerKey;
  onChange: (ticker: TickerKey) => void;
}

export function TickerSelector({ value, onChange }: TickerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const filteredTickers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return TICKERS;
    return TICKERS.filter((ticker) => ticker.toLowerCase().includes(trimmed));
  }, [query]);

  const onSelect = (ticker: TickerKey) => {
    onChange(ticker);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <p className="label mb-2">Ticker</p>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="card-surface flex w-full items-center justify-between px-4 py-3 text-left transition hover:border-[color:var(--border-strong)]"
      >
        <span className="data-mono text-lg font-medium text-[var(--text-primary)]">{value}</span>
        <span className="text-xs text-[var(--text-secondary)]">{isOpen ? "Close" : "Select"}</span>
      </button>

      {isOpen ? (
        <div className="card-surface absolute z-20 mt-2 w-full overflow-hidden">
          <div className="border-b border-[color:var(--border)] p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticker"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--accent)]"
            />
          </div>

          <ul className="max-h-56 overflow-y-auto p-2">
            {filteredTickers.length === 0 ? (
              <li className="rounded-md px-3 py-2 text-sm text-[var(--text-muted)]">No tickers found.</li>
            ) : (
              filteredTickers.map((ticker) => {
                const support = EXCHANGES.filter((exchange) => Boolean(TICKER_MAP[ticker][exchange]))
                  .map((exchange) => EXCHANGE_LABELS[exchange])
                  .join(", ");

                return (
                  <li key={ticker}>
                    <button
                      type="button"
                      onClick={() => onSelect(ticker)}
                      className={`w-full rounded-md px-3 py-2 text-left transition hover:bg-[color:rgba(79,140,255,0.11)] ${
                        ticker === value ? "bg-[color:rgba(79,140,255,0.11)]" : ""
                      }`}
                    >
                      <p className="data-mono text-sm font-medium text-[var(--text-primary)]">{ticker}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{support}</p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
