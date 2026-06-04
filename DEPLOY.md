# Deploying FundedCore to Vercel (project: `fundedcore`)

The `fundedcore` Vercel project is connected to the GitHub repo
`nicolugo0503-glitch/fundedcore` and auto-deploys on every push to `main`.
Pick whichever path is easiest — both replace the current (broken) production deployment.

## Option A — push to GitHub (auto-deploys, recommended)
From the project folder:
```bash
git add -A
git commit -m "rebuild: AI-native prop firm — Trader Score engine, apply flow, funded dashboard"
git push origin main
```
Vercel picks it up automatically and ships it to production in ~1–2 minutes.

## Option B — Vercel CLI (direct)
```bash
npm i -g vercel
vercel link          # select the existing "fundedcore" project (already linked via .vercel/)
vercel deploy --prod
```

## Notes
- `next.config.mjs` already detects Vercel (`VERCEL` env) and uses the standard
  Next.js build there; the static-export/basePath config only applies to GitHub Pages.
- No environment variables are required — scoring runs entirely client-side.
- The previous production deployment was failing to build; this rebuild compiles clean
  (`npm run build` → all routes prerendered).
