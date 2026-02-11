# Compare Liquidity UI

Modern, real-time liquidity comparison dashboard for perpetual markets.

## Deploy to GitHub Pages

This project is configured for static export (`output: "export"`) and can be hosted on GitHub Pages.

### 1) Enable Pages in GitHub

In your repository:

- **Settings → Pages**
- **Build and deployment → Source: GitHub Actions**

### 2) Push to `main`

The workflow at `.github/workflows/deploy-pages.yml` will:

- install dependencies
- run `npm run build`
- deploy the generated `out/` directory to GitHub Pages

### 3) Access URL

Your site will be published at:

`https://<your-org-or-username>.github.io/<repo-name>/`

## Important data-fetching note

GitHub Pages is static hosting only (no Node.js server/runtime APIs).

To support Pages hosting, orderbook data is fetched directly from exchange APIs in the browser.

If any exchange blocks browser CORS from your Pages domain, set an optional proxy prefix:

- `NEXT_PUBLIC_HTTP_PROXY_PREFIX`

Example:

```bash
NEXT_PUBLIC_HTTP_PROXY_PREFIX="https://your-proxy.example.com/?url="
```

The proxy must accept a URL-encoded upstream URL appended to the prefix.


## Hyperliquid depth + data accuracy

For Hyperliquid `l2Book`, the response is effectively capped at around 20 levels per side.

- We keep high-granularity parameters (`nSigFigs: 5`, `mantissa: 2`) to preserve price precision at available depth.
- We do **not** synthesize extra levels, because artificial interpolation can distort slippage/spread quality.
- If deeper true depth is required, the next step is a dedicated Hyperliquid streaming/deeper-book integration rather than fabricating levels in UI logic.

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```
