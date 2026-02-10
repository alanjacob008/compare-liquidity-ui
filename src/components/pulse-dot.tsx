"use client";

import { useEffect, useMemo, useState } from "react";

interface PulseDotProps {
  timestamp: number | null;
}

const FRESH_MS = 4_000;
const AGING_MS = 10_000;

export function PulseDot({ timestamp }: PulseDotProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const freshness = useMemo(() => {
    if (!timestamp) {
      return {
        className: "pulse-neutral",
        label: "No sample",
      };
    }

    const age = Math.max(0, now - timestamp);

    if (age < FRESH_MS) {
      return {
        className: "pulse-green",
        label: "Live",
      };
    }

    if (age < AGING_MS) {
      return {
        className: "pulse-yellow",
        label: "Aging",
      };
    }

    return {
      className: "pulse-red",
      label: "Stale",
    };
  }, [now, timestamp]);

  return (
    <span className="data-mono inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span className={`h-2.5 w-2.5 rounded-full ${freshness.className}`} />
      {freshness.label}
    </span>
  );
}
