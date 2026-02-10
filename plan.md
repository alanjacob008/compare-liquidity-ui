# compare-liquidity-ui — Implementation Plan

## What This Is
A standalone real-time web dashboard that fetches orderbook data from 4 perpetual DEXs (Hyperliquid, dYdX, Lighter, AsterDEX), computes slippage at various notional tiers, and visualizes the comparison using live bar charts. UI inspired by [ammchallenge.com](https://www.ammchallenge.com/) — dark earthy tones, serif headings, monospace data.

## Tech Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **Recharts** for bar chart visualization
- Plain React hooks for state (no external state library)

---

## Architecture

### Data Flow
```
Browser polling (1.5s interval)
    ↓
Next.js API route /api/orderbook?exchange=X&ticker=Y  (CORS proxy)
    ↓
Exchange REST APIs (Hyperliquid, dYdX, Lighter, AsterDEX)
    ↓ raw JSON response
Client-side parsing → NormalizedBook → computeSlippage() → LiquidityAnalysis → Charts
```

### Why a CORS Proxy?
Exchange APIs (dYdX, Lighter, AsterDEX) don't set permissive CORS headers. A thin Next.js API route fetches server-side and pipes raw JSON back. No transformation on the server — all slippage math runs in the browser for fast iteration.

---

## Ticker Mapping

Each canonical ticker maps to exchange-specific symbols:

| Canonical | Hyperliquid | dYdX     | Lighter  | AsterDEX  |
|-----------|-------------|----------|----------|-----------|
| BTC       | BTC         | BTC-USD  | BTC-USD  | BTCUSDT   |
| ETH       | ETH         | ETH-USD  | ETH-USD  | ETHUSDT   |
| SOL       | SOL         | SOL-USD  | SOL-USD  | SOLUSDT   |

Lighter uses numeric market IDs internally. The API route resolves symbol→market_id by calling Lighter's `/api/v1/orderBooks` endpoint (cached for 5 minutes).

---

## Slippage Computation

Ported verbatim from the existing `compare-liquidity` project (`hyperliquid.ts` lines 23-68).

- **4 notional tiers**: $1,000 / $10,000 / $100,000 / $1,000,000
- Walks the order book to compute VWAP for a given notional fill
- Slippage = distance from mid price to VWAP, in basis points
- Tracks whether the full notional was filled or only partial

---

## Exchange API Details

| Exchange    | Method | Endpoint                                                                 | Response Shape                         |
|-------------|--------|--------------------------------------------------------------------------|----------------------------------------|
| Hyperliquid | POST   | `https://api.hyperliquid.xyz/info` body: `{type:"l2Book",coin:"BTC"}`   | `{levels: [[{px,sz,n}], [{px,sz,n}]]}` |
| dYdX        | GET    | `https://indexer.dydx.trade/v4/orderbooks/perpetualMarket/{ticker}`      | `{bids:[{price,size}], asks:[...]}`    |
| Lighter     | GET    | `https://mainnet.zklighter.elliot.ai/api/v1/orderBookOrders?market_id=N` | `{bids:[{price,remaining_base_amount}], asks:[...]}` |
| AsterDEX    | GET    | `https://fapi.asterdex.com/fapi/v1/depth?symbol=BTCUSDT&limit=100`      | `{bids:[[price,qty]], asks:[[price,qty]]}` |

---

## Project Structure

```
compare-liquidity-ui/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── plan.md                          ← this file
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout: fonts, metadata, dark theme
│   │   ├── page.tsx                 # Main page: hooks → components
│   │   ├── globals.css              # Tailwind directives + CSS custom properties
│   │   └── api/
│   │       └── orderbook/
│   │           └── route.ts         # Unified CORS-proxy for all 4 exchanges
│   ├── lib/
│   │   ├── types.ts                 # SlippageResult, LiquidityAnalysis, NormalizedBook, ExchangeStatus
│   │   ├── constants.ts             # NOTIONAL_TIERS, EXCHANGE_CONFIGS, TICKERS array
│   │   ├── slippage.ts              # computeSlippage() + analyzeBook()
│   │   ├── exchanges/
│   │   │   ├── index.ts             # Exchange registry (name → parser + color)
│   │   │   ├── hyperliquid.ts       # Parse Hyperliquid → NormalizedBook
│   │   │   ├── dydx.ts              # Parse dYdX → NormalizedBook
│   │   │   ├── lighter.ts           # Parse + aggregate Lighter orders → NormalizedBook
│   │   │   └── asterdex.ts          # Parse Binance-style arrays → NormalizedBook
│   │   └── format.ts                # formatBps(), formatUsd(), formatPrice()
│   ├── hooks/
│   │   └── use-liquidity-poll.ts    # Core polling hook: parallel fetch → parse → slippage → state
│   └── components/
│       ├── header.tsx               # Title + decorative SVG accent curve
│       ├── ticker-selector.tsx      # Dropdown with search, shows exchange availability per ticker
│       ├── dashboard.tsx            # Grid layout assembling all visualization panels
│       ├── spread-cards.tsx         # Row of cards: mid price, spread, best bid/ask per exchange
│       ├── slippage-chart.tsx       # Recharts grouped BarChart (one per side: bid or ask)
│       ├── slippage-panel.tsx       # Side-by-side container for bid + ask charts
│       ├── data-table.tsx           # Detailed slippage breakdown table with all tiers
│       └── pulse-dot.tsx            # Animated freshness indicator (green/yellow/red)
```

---

## Visual Design (ammchallenge.com-inspired)

### Color Palette
| Token           | Value     | Usage                        |
|-----------------|-----------|------------------------------|
| bg-primary      | `#1a1510` | Page background              |
| bg-secondary    | `#241e17` | Panel background             |
| bg-card         | `#2d251d` | Card surfaces                |
| border          | `#3d3329` | Subtle warm borders          |
| text-primary    | `#e8e0d4` | Main text (warm off-white)   |
| text-secondary  | `#a39685` | Labels, descriptions         |
| text-muted      | `#6b5e50` | Axis labels, footnotes       |
| accent          | `#a0522d` | Primary accent (sienna)      |

### Exchange Colors
| Exchange    | Color     |
|-------------|-----------|
| Hyperliquid | `#a0522d` |
| dYdX        | `#7c6fdb` |
| Lighter     | `#4a9e7a` |
| AsterDEX    | `#c88832` |

### Typography
- **Crimson Pro** (italic, 600-700) — headings, section titles
- **JetBrains Mono** (400-500) — all data: prices, bps, table cells
- **Inter** — body text, labels, buttons

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [SVG Curve]  Compare Liquidity                         │
│  Real-time perpetual DEX comparison  [Ticker Selector ▾]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │HyperLiquid│ │  dYdX    │ │ Lighter  │ │ AsterDEX │  │
│  │mid: $97K  │ │mid: $97K │ │mid: $97K │ │mid: $97K │  │
│  │sprd: 0.5bp│ │sprd: 1bp │ │sprd: 2bp │ │sprd: 0.8b│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ┌────────────────────────┐ ┌────────────────────────┐  │
│  │ ASK SLIPPAGE (Buying)  │ │ BID SLIPPAGE (Selling) │  │
│  │                        │ │                        │  │
│  │  ▐▐▐▐  ▐▐▐▐  ▐▐▐▐     │ │  ▐▐▐▐  ▐▐▐▐  ▐▐▐▐     │  │
│  │  $1K   $10K  $100K $1M │ │  $1K   $10K  $100K $1M │  │
│  └────────────────────────┘ └────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Detailed Table                                      ││
│  │ Exchange │ $1K Bid │ $1K Ask │ $10K Bid │ ...       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Scaffold
1. **Create Next.js project** — `npx create-next-app@latest` with TS + Tailwind + App Router
2. **Configure theme** — `globals.css` with dark earthy CSS variables, fonts in `layout.tsx`, install recharts

### Phase 2: Core Logic
3. **Types + constants** — `lib/types.ts`, `lib/constants.ts` (tickers, tiers, exchange configs), `lib/format.ts`
4. **Slippage engine** — Port `computeSlippage()` and create `analyzeBook()` in `lib/slippage.ts`
5. **Exchange parsers** — 4 parsers in `lib/exchanges/` + registry in `index.ts`

### Phase 3: API Layer
6. **CORS proxy route** — `/api/orderbook/route.ts` validates params, constructs upstream request per exchange, proxies JSON. Includes Lighter market ID caching.

### Phase 4: Polling Hook
7. **use-liquidity-poll** — Polls every 1.5s with `Promise.allSettled` for each enabled exchange. Parses responses via exchange registry, computes slippage, returns `Record<string, ExchangeStatus>`.

### Phase 5: UI Components
8. **header.tsx** — Crimson Pro italic title + animated SVG accent curve
9. **ticker-selector.tsx** — Searchable dropdown, shows which exchanges support each ticker
10. **spread-cards.tsx** — Exchange cards with live mid price, spread, pulse dot
11. **slippage-chart.tsx + slippage-panel.tsx** — Recharts grouped bar charts (X=tiers, bars=exchanges)
12. **data-table.tsx** — Full breakdown table with conditional formatting for partial fills
13. **dashboard.tsx + page.tsx** — Wire hooks to components, assemble full layout

### Phase 6: Polish
14. **Responsive layout**, loading skeletons, error states, hover animations, pulse dot animations

---

## Verification
1. `npm run dev` — site loads at localhost:3000
2. Default BTC ticker shows data from all 4 exchanges updating live
3. Bar charts refresh every ~1.5 seconds with fresh orderbook data
4. Switch ticker to ETH or SOL — charts re-fetch and update
5. If one exchange errors, the other 3 continue working independently
6. Spread cards show accurate mid price, spread in bps, and green pulse dots

---

## Reference Files (from existing project)
- `../compare-liquidity/src/types.ts` — type definitions to mirror
- `../compare-liquidity/src/hyperliquid.ts` (lines 23-68) — `computeSlippage()` reference implementation
- `../compare-liquidity/src/lighter.ts` (lines 48-56) — `aggregateLevels()` logic to port
- `../compare-liquidity/src/lighter.ts` (lines 17-39) — market ID discovery + resolution logic
