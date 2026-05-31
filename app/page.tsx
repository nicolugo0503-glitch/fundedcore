import Link from "next/link";

const verdicts = [
  { v: "APPROVE", c: "#2ADB8A", d: "Within every limit. Shows the buffer left after the trade." },
  { v: "REDUCE", c: "#E8B84B", d: "Too big as-is. Suggests the largest size that stays safe." },
  { v: "WAIT", c: "#E8B84B", d: "A time rule blocks it now — news, or a post-loss cool-down." },
  { v: "BLOCK", c: "#E85050", d: "No safe version exists right now. The account stays alive." },
];
const features = [
  { k: "01 · Firewall", t: "Stop the account-ending trade", d: "Every proposed trade is checked against your firm's exact rules and your live account state before you place it — daily loss, drawdown, consistency, news, contract caps." },
  { k: "02 · Behavioral engine", t: "Expose what's destroying you", d: "From your own history it finds your failure signature — revenge sizing, tilt windows, overtrading on red days — ranked by what it actually costs you." },
  { k: "03 · Edge analytics", t: "Prove what to cut and scale", d: "Your real expectancy by setup, time, and instrument — plus a counterfactual: your equity if you simply stopped taking your negative-expectancy trades." },
];

export default function Home() {
  return (
    <main className="font-body text-t1">
      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-bd bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="font-sans text-lg font-bold tracking-wide">FUNDED<span className="text-acc">.</span>CORE</div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#how" className="hidden text-t2 hover:text-t1 sm:block">How it works</a>
            <a href="#pricing" className="hidden text-t2 hover:text-t1 sm:block">Pricing</a>
            <Link href="/dashboard" className="rounded-md bg-acc px-4 py-2 text-sm font-semibold text-bg hover:bg-[#9fd0e6]">Open the app</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-bd px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-t2">
          <span className="h-1.5 w-1.5 rounded-full bg-grn pulse" /> Pre-trade risk firewall
        </div>
        <h1 className="font-sans text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Keep the account alive.<br />
          <span className="bg-gradient-to-r from-white to-acc bg-clip-text text-transparent">Then make it profitable.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-t2">
          FundedCore checks every trade against your prop firm&apos;s exact rules and your live account state — before you place it. Then it shows you the behavior bleeding your edge, and proves what to cut and what to scale.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg bg-acc px-7 py-3.5 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-[#9fd0e6]">Launch the app →</Link>
          <a href="#how" className="rounded-lg border border-bd px-7 py-3.5 font-mono text-sm uppercase tracking-wider text-t2 hover:text-t1">See how it works</a>
        </div>
        <p className="mt-4 font-mono text-xs text-t3">Free to start · runs in your browser · no account needed for the demo</p>
      </section>

      {/* VERDICTS */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {verdicts.map((v) => (
            <div key={v.v} className="overflow-hidden rounded-xl border border-bd bg-panel">
              <div className="py-4 text-center font-sans text-xl font-bold tracking-wide" style={{ background: v.c, color: "#021018" }}>{v.v}</div>
              <p className="p-5 text-sm text-t1">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-acc">What it does</div>
          <h2 className="font-sans text-4xl font-bold tracking-tight">Three jobs. One screen.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.k} className="rounded-xl border border-bd bg-panel p-7">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-acc">{f.k}</div>
              <h3 className="mb-3 font-sans text-xl font-semibold">{f.t}</h3>
              <p className="text-sm leading-relaxed text-t2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-acc">Pricing</div>
          <h2 className="font-sans text-4xl font-bold tracking-tight">Cheaper than one re-buy.</h2>
          <p className="mt-3 text-t2">Start free. Upgrade when you add a second account.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "Starter", p: "$0", w: "New & evaluation traders", f: ["1 funded account", "Pre-trade firewall", "Survival monitor", "Major-firm rule packs"], hi: false },
            { n: "Pro", p: "$39", w: "Active funded traders", f: ["Multiple accounts", "Behavioral engine", "Edge analytics + CSV import", "Real-time breach alerts"], hi: true },
            { n: "Desk", p: "$99", w: "Multi-account & coaches", f: ["Everything in Pro", "Unlimited accounts", "Account routing", "Team dashboards"], hi: false },
          ].map((t) => (
            <div key={t.n} className={`rounded-2xl border p-7 ${t.hi ? "border-acc bg-panel2" : "border-bd bg-panel"}`}>
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-acc">{t.n}</div>
              <div className="mt-2 font-sans text-4xl font-bold">{t.p}<span className="text-base font-medium text-t2">{t.p !== "$0" ? "/mo" : ""}</span></div>
              <div className="mt-1 text-sm italic text-t2">{t.w}</div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {t.f.map((x) => (<li key={x} className="flex gap-2 text-t1"><span className="text-grn">✓</span>{x}</li>))}
              </ul>
              <Link href="/dashboard" className={`mt-7 block rounded-lg py-3 text-center font-mono text-xs font-semibold uppercase tracking-wider ${t.hi ? "bg-acc text-bg hover:bg-[#9fd0e6]" : "border border-bd text-t2 hover:text-t1"}`}>Start</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="font-sans text-5xl font-bold tracking-tight">Stop blowing <span className="bg-gradient-to-r from-white to-acc bg-clip-text text-transparent">the account.</span></h2>
        <p className="mx-auto mt-5 max-w-md text-t2">Check every trade before it fires. Find the leak. Scale what works.</p>
        <Link href="/dashboard" className="mt-8 inline-block rounded-lg bg-acc px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-bg hover:bg-[#9fd0e6]">Open FundedCore →</Link>
      </section>

      <footer className="border-t border-bd py-8">
        <div className="mx-auto max-w-6xl px-6 font-mono text-[10px] leading-relaxed text-t3">
          <div className="mb-3 flex flex-wrap justify-between gap-3">
            <span>© 2026 FundedCore · The pre-trade risk firewall for funded traders</span>
            <span>BUILT FOR FUNDED TRADERS</span>
          </div>
          <p className="max-w-3xl">FundedCore is decision-support software. It is not a broker, does not execute trades, and does not provide trading or financial advice. Rule values shown are illustrative, not official firm terms. No tool can guarantee profitability; trading leveraged products carries substantial risk of loss.</p>
        </div>
      </footer>
    </main>
  );
}
