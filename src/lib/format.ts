const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const usdStandard = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number, compact = false): string {
  if (!Number.isFinite(value)) return "--";
  return compact ? usdCompact.format(value) : usdStandard.format(value);
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const decimals = value >= 1_000 ? 2 : value >= 1 ? 4 : 6;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatBps(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} bps`;
}

export function formatTier(notional: number): string {
  if (notional >= 1_000_000) return `$${notional / 1_000_000}M`;
  if (notional >= 1_000) return `$${notional / 1_000}K`;
  return formatUsd(notional);
}
