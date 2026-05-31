# FundedCore

**The pre-trade risk firewall for funded traders.** Stop the trade that blows your account, expose the behavior destroying you, and prove — with your own numbers — what to cut and what to scale.

A production-ready **Next.js 14** app (App Router, TypeScript, Tailwind). All logic runs in the browser — **no database, no API keys, deploys to Vercel with zero config.**

## What's inside

- **Landing page** (`/`) — product story, verdict cards, pricing.
- **Dashboard** (`/dashboard`) — the working app, four tabs:
  - **Pre-Trade Firewall** — real rule engine returns APPROVE / REDUCE / WAIT / BLOCK against firm rules + live account state.
  - **Behavioral Engine** — finds your failure signature (revenge sizing, tilt windows, overtrading) ranked by cost.
  - **Edge Analytics** — expectancy by setup/time + a counterfactual equity curve (your equity if you cut negative-expectancy trades).
  - **Journal** — sample data + **CSV import** to run it on your real trades.
- **Engine** (`lib/engine.ts`) — pure, unit-tested logic: rule packs, pre-trade check, expectancy, behavior, equity, CSV parsing.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy to Vercel

**Option A — Vercel CLI (fastest):**
```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

**Option B — GitHub + Vercel dashboard:**
```bash
git init && git add -A && git commit -m "FundedCore v0.1"
git branch -M main
git remote add origin https://github.com/<you>/fundedcore.git
git push -u origin main
```
Then on vercel.com → **Add New → Project → Import** the repo. Framework auto-detects as Next.js. No environment variables needed. Click **Deploy**.

## CSV format (Journal → Import)

Headers: `date,hour,instrument,setup,dir,size,pnl` (optional: `R`, `risk`, `tag`).
A trade tagged `revenge`/`chase`/`tilt` is flagged by the behavioral engine. Download the template from the Journal tab.

## Roadmap (next build phases)

1. Accounts & persistence (NextAuth + a DB) so journals sync across devices.
2. Real firm rule-pack library, versioned with effective dates.
3. Broker / platform sync to auto-fill the journal.
4. The cross-trader "Risk Graph" — benchmarking and scaling-readiness.

## Disclaimer

FundedCore is decision-support software. It is **not a broker**, does not execute trades, and does not provide trading or financial advice. Rule values and the sample journal are **illustrative**, not official firm terms or real trades. No tool can guarantee profitability; trading leveraged products carries substantial risk of loss.
