"use client";

export function Header() {
  return (
    <header className="panel relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
      <svg
        className="accent-curve pointer-events-none absolute right-[-56px] top-[-24px] h-44 w-72 opacity-70 sm:h-52 sm:w-80"
        viewBox="0 0 380 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 112C61 51 113 26 175 34C241 42 278 109 364 80"
          stroke="rgba(200, 136, 50, 0.85)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10 142C70 94 135 81 195 97C257 114 302 156 371 141"
          stroke="rgba(160, 82, 45, 0.75)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10">
        <p className="label">Compare Liquidity</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl italic leading-tight text-[var(--text-primary)] sm:text-5xl">
          Real-Time Perpetual DEX Slippage Monitor
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
          Compare execution quality across four venues with live spread and notional slippage tiers.
        </p>
      </div>
    </header>
  );
}
