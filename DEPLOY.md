# Deploy FundedCore in ~2 minutes

## Fastest: Vercel CLI
```bash
cd fundedcore
npm install
npm i -g vercel
vercel login        # if not already logged in
vercel --prod       # follow prompts; accept defaults (Next.js auto-detected)
```
That's it — you'll get a live URL.

## Via GitHub (recommended for ongoing work)
```bash
cd fundedcore
git init && git add -A && git commit -m "FundedCore v0.1"
git branch -M main
git remote add origin https://github.com/<your-username>/fundedcore.git
git push -u origin main
```
Then: vercel.com → Add New → Project → Import `fundedcore` → Deploy.
Every future `git push` auto-deploys.

No environment variables required for this version.
