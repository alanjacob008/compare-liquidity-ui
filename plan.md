# Historical Data Collection Plan

## Goal
Collect and store liquidity data (spread, slippage) for multiple pairs across 6 exchanges using GitHub Actions. Store as CSV in the repo for easy viewing and future PostgreSQL import.

---

## Pairs Support

### Current
- BTC, ETH, SOL (3 tickers × 6 exchanges)

### Extensible Design
- Pairs list defined in a config file (`scripts/config.json` or similar)
- Adding a new pair = add one entry to the config
- Each exchange has its own symbol mapping (already exists in `TICKER_MAP`)

### Config example
```json
{
  "pairs": ["BTC", "ETH", "SOL"],
  "exchanges": ["hyperliquid", "dydx", "lighter", "asterdex", "binance", "bybit"],
  "samples_per_minute": 3,
  "run_duration_minutes": 15
}
```

### Questions
- Do we want to support non-perp pairs later (spot)?
- Any pairs beyond BTC/ETH/SOL to add now?

---

## GitHub Action Strategy

### The Problem
- GitHub Actions cron minimum is every 5 minutes
- But we want dense data (1-min medians)
- We also don't want to hit rate limits

### The Approach: Long-running Action with chained dispatch

**Each run:**
1. Action starts
2. Runs a Node script for **15 minutes**
3. Every minute within those 15 min:
   - Fetch each exchange 3 times (~5s apart)
   - Compute median of the 3 fetches
   - That's 1 row per exchange per ticker per minute
4. After 15 min, write all rows to CSV, commit, push
5. At the end, trigger the next run via `workflow_dispatch`

**This gives us:**
- 15 median rows per exchange per ticker per run
- Continuous back-to-back runs (no gaps)
- 1 commit every 15 min (not every minute — cleaner git history)
- No cron schedule needed after the first trigger

### Rows per run
```
15 minutes × 3 tickers × 6 exchanges = 270 rows per run
```

### Rows per day
```
96 runs × 270 rows = 25,920 rows/day
```

### Chaining: How it works
```
Run N starts
  → collects for 15 min
  → commits CSV
  → calls: gh workflow run collect.yml
Run N+1 starts immediately
  → repeats
```

### Safety
- Add a `COLLECT_ENABLED` repo variable — set to `false` to stop the chain
- Max runtime guard: if Action has been running > 20 min, abort
- If a run fails, cron backup kicks in (every 30 min) to restart the chain

### Rate Limits
- GitHub Actions: 1,000 API requests per hour per repo — we use ~4 per run (checkout, commit, push, dispatch) = ~16/hour, well within limits
- Exchange APIs: 3 fetches × 6 exchanges × 3 tickers × 15 min = 810 fetches/run. All exchanges allow this easily.

### Questions
- Should we add a cooldown between runs (e.g., 1 min gap)?
- Do we want to keep running 24/7 or only during certain hours?

---

## Data Collection: 1-Minute Median

### Within each minute
1. Fetch orderbook 3 times, ~15-20s apart
2. For each fetch, compute: mid_price, best_bid, best_ask, spread_bps, slippage at 4 tiers
3. Take **median** of the 3 values for each field
4. Output 1 row

### Why median
- Filters outliers (one bad fetch doesn't corrupt the row)
- More stable than single snapshot
- 3 samples is enough — median of 3 = the middle value

### Timing within a minute
```
t=0s   fetch #1
t=20s  fetch #2
t=40s  fetch #3
t=55s  compute median, store row
t=60s  next minute starts
```

---

## CSV Format

### File structure
```
data/
  2026-02.csv     ← one file per month
  2026-03.csv
```

### Why monthly files
- ~25K rows/day × 30 days = ~780K rows/month
- ~200 bytes/row = ~156 MB/month — TOO BIG for GitHub

### Revised: Daily files
```
data/
  2026-02-12.csv
  2026-02-13.csv
```
- ~25K rows/day × 200 bytes = ~5 MB/day — good for GitHub
- GitHub renders CSV as a table up to ~512KB displayed (rest downloadable)

### Alternative: Daily files, monthly archive
```
data/
  daily/
    2026-02-12.csv    ← current day (appended to)
    2026-02-13.csv
  archive/
    2026-02.csv.gz    ← compressed monthly rollup
```

### Questions
- Daily files vs monthly files?
- Compress old files or keep raw?
- GitHub has a soft limit of 1GB repo size — at 5MB/day that's ~200 days before concern. Should we plan for cleanup?

---

## CSV Schema

```
ts,exchange,ticker,mid_price,best_bid,best_ask,spread_usd,spread_bps,ask_slip_1k,ask_slip_10k,ask_slip_100k,ask_slip_1m,bid_slip_1k,bid_slip_10k,bid_slip_100k,bid_slip_1m,ask_1m_filled,bid_1m_filled
```

### Column types (for future PG import)
| Column | Type | Notes |
|---|---|---|
| ts | TIMESTAMPTZ | ISO 8601, UTC |
| exchange | TEXT | hyperliquid, dydx, binance, etc. |
| ticker | TEXT | BTC, ETH, SOL |
| mid_price | NUMERIC | |
| best_bid | NUMERIC | |
| best_ask | NUMERIC | |
| spread_usd | NUMERIC | |
| spread_bps | NUMERIC | |
| ask_slip_1k | NUMERIC | median slippage bps |
| ask_slip_10k | NUMERIC | |
| ask_slip_100k | NUMERIC | |
| ask_slip_1m | NUMERIC | |
| bid_slip_1k | NUMERIC | |
| bid_slip_10k | NUMERIC | |
| bid_slip_100k | NUMERIC | |
| bid_slip_1m | NUMERIC | |
| ask_1m_filled | BOOLEAN | false = partial fill at $1M |
| bid_1m_filled | BOOLEAN | |

### Sample row
```
2026-02-12T03:50:00Z,binance,BTC,67535.95,67535.90,67536.00,0.10,0.0148,0.01,0.01,0.07,1.44,0.01,0.01,0.01,1.15,false,true
```

### PG import (one-liner)
```sql
COPY ticks FROM '/path/2026-02-12.csv' CSV HEADER;
```

---

## Action Workflow File

### Rough structure
```yaml
name: Collect Liquidity Data
on:
  workflow_dispatch:       # manual trigger + chained trigger
  schedule:
    - cron: '0,30 * * * *'  # backup: every 30 min in case chain breaks

jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/collect.mjs
      - name: Commit and push
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add data/
          git diff --cached --quiet || git commit -m "data: $(date -u +%Y-%m-%dT%H:%M)"
          git push
      - name: Chain next run
        if: vars.COLLECT_ENABLED == 'true'
        run: gh workflow run collect.yml
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Script: collect.mjs

### Responsibilities
1. Read config (pairs, exchanges, duration)
2. Loop for 15 minutes:
   - Each minute: fetch 3 samples, compute median
   - Accumulate rows in memory
3. Append all rows to today's CSV file
4. Exit

### Error handling
- If an exchange fails all 3 fetches in a minute, write null for that row
- If ALL exchanges fail, still write the timestamp rows (shows gaps in data)
- Log errors to stdout (visible in Action logs)

---

## Decisions Made

1. **Branch**: Dedicated `data` branch (keeps main clean)
2. **Hours**: 24/7 continuous collection
3. **Errors**: Write the error string (e.g. "unreachable", "timeout", "rate_limited") in an `error` column for debugging — don't skip the row
4. **Pairs**: BTC + ETH + SOL to start, config-driven for easy addition

## Open Questions

1. **File rotation**: Daily files — when do we archive/compress old ones?
2. **Repo size**: At 5MB/day, ~1.5GB/year. Plan for cleanup or separate data repo?
3. ~~**Lighter**~~: Documented limits are strict but empirical testing shows no throttling on public reads. Safe to poll normally.
4. **Run gap**: Any cooldown between chained runs or back-to-back?

---

## Rate Limits vs Our Usage

### Per-exchange limits (orderbook endpoint)

| Exchange | Budget | Window | Cost/call | Max calls/min | Our use (3 pairs, 3 samples/min) | Headroom |
|---|---|---|---|---|---|---|
| Binance | 2,400 weight | 1 min | 10w (limit=100) | 240 | 90w (9 calls) | 96% free |
| Bybit | 600 req | 5 sec | 1 req | 7,200/min | 9 calls | 99% free |
| dYdX | 100 req | 10 sec | 1 req | 600/min | 9 calls | 98% free |
| Hyperliquid | 1,200 weight | 1 min | 2w | 600 | 18w (9 calls) | 98% free |
| AsterDEX | 2,400 weight | 1 min | 5w (limit=100) | 480 | 45w (9 calls) | 98% free |
| Lighter | No limit (anon GETs) | N/A | N/A | 60+ concurrent OK | No concern |

### Scaling: max pairs per exchange

| Exchange | Safe max pairs (3 samples/min) | Bottleneck |
|---|---|---|
| Binance | ~80 pairs | Weight budget |
| Bybit | ~200+ pairs | Effectively unlimited |
| dYdX | ~80 pairs | 100 req/10s burst |
| Hyperliquid | ~200 pairs | Weight budget |
| AsterDEX | ~160 pairs | Weight budget |
| Lighter | ~200+ pairs | No practical limit on public reads |

**Overall bottleneck at scale**: dYdX and Binance tie at ~80 pairs. Staggering fetches across exchanges pushes this higher.

### Error column for unreachable exchanges

When an exchange fails, the row is still written with prices/slippage as empty and an error column:
```
2026-02-12T03:50:00Z,lighter,BTC,,,,,,,,,,,,,,,,unreachable: fetch failed
2026-02-12T03:50:00Z,asterdex,BTC,,,,,,,,,,,,,,,,timeout after 10s
```

This preserves the timeline and makes gaps/issues visible in the data.

---

## Updated CSV Schema

```
ts,exchange,ticker,mid_price,best_bid,best_ask,spread_usd,spread_bps,ask_slip_1k,ask_slip_10k,ask_slip_100k,ask_slip_1m,bid_slip_1k,bid_slip_10k,bid_slip_100k,bid_slip_1m,ask_1m_filled,bid_1m_filled,error
```

Added `error` column (empty on success, error string on failure).

---

## Summary

| Item | Decision |
|---|---|
| Frequency | 1-min medians (3 samples/min) |
| Run duration | 15 min per Action run |
| Chaining | workflow_dispatch at end of each run |
| Backup | Cron every 30 min |
| Pairs | BTC, ETH, SOL (configurable) |
| Exchanges | 6 (skip unreachable gracefully, log error) |
| File format | CSV, one per day |
| Branch | `data` branch (dedicated) |
| Hours | 24/7 |
| Rows/run | 270 (15 min × 3 tickers × 6 exchanges) |
| Rows/day | ~25,920 |
| Size/day | ~5 MB |
| Kill switch | `COLLECT_ENABLED` repo variable |
| Error handling | Write error string in `error` column, keep row |
