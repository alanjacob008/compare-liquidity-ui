import type { BookLevel, NormalizedBook } from "../types";

interface LighterOrder {
  price: string;
  remaining_base_amount: string;
}

interface LighterBookResponse {
  bids?: LighterOrder[];
  asks?: LighterOrder[];
}

function aggregateLevels(orders: LighterOrder[] | undefined): BookLevel[] {
  if (!orders) return [];

  const levelMap = new Map<number, number>();

  for (const order of orders) {
    const px = Number.parseFloat(order.price);
    const sz = Number.parseFloat(order.remaining_base_amount);

    if (!Number.isFinite(px) || !Number.isFinite(sz) || px <= 0 || sz <= 0) {
      continue;
    }

    levelMap.set(px, (levelMap.get(px) ?? 0) + sz);
  }

  return Array.from(levelMap.entries()).map(([px, sz]) => ({ px, sz }));
}

export function parseLighterBook(raw: unknown): NormalizedBook {
  const data = raw as LighterBookResponse;
  if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
    throw new Error("Invalid Lighter order book response");
  }

  const bids = aggregateLevels(data.bids).sort((a, b) => b.px - a.px);
  const asks = aggregateLevels(data.asks).sort((a, b) => a.px - b.px);

  if (bids.length === 0 || asks.length === 0) {
    throw new Error("Lighter order book is empty");
  }

  return {
    bids,
    asks,
    timestamp: Date.now(),
  };
}
