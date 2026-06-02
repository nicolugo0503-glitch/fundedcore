"use client";
import Link from "next/link";
import { useState } from "react";

// ── Firm badges ──────────────────────────────────────────────────────────────
const FIRMS_SUPPORTED = [
  { name: "TopStep",          detail: "50K / 100K / 150K Combine & XFA" },
  { name: "Apex",             detail: "25K / 50K / 100K / 150K EOD Eval" },
  { name: "MyFundedFutures",  detail: "Core & Rapid plans" },
  { name: "TradeDay",         detail: "50K / 100K — no DLL, no consistency" },
];

// ── Pricing tiers ────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    cta: "Open Dashboard",
    ctaHref: "/dashboard",
    highlight: false,
    features: [
      "1 firm (TopStep Combine 50K)",
      "Pre-trade firewall with verdict",
      "Behavioral engine — find your failure signature",
      "Journal: 50-trade history",
      "Monte Carlo survival simulation",
    ],
    missing: [
      "Full firm library (13 accounts)",
      "Live news window detection",
      "CSV import from any platform",
      "Edge analytics & counterfactual equity",
      "Priority rule updates",
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    cta: "Start Free Trial",
    ctaHref: "/dashboard",
    highlight: true,
    badge: "Most popular",
    features: [
      "All 13 firm accounts — TopStep, Apex, MFF, TradeDay",
      "Live economic news window detection (CPI, NFP, FOMC…)",
      "Full behavioral engine — ranked by cost",
      "CSV import from NinjaTrader, Tradovate, TradeLocker",
      "Edge analytics + counterfactual equity curve",
      "Monte Carlo fan chart — blow-up probability",
      "FundedScore™ composite rating",
      "Priority rule updates when firms change terms",
    ],
    missing: [],
  },
  {
    name: "Desk",
    price: "$49",
    period: "/ month",
    cta: "Contact Us",
    ctaHref: "mailto:hello@fundedcore.io",
    highlight: false,
    features: [
      "Everything in Pro",
      "Up to 5 team traders",
      "Shared journal & cross-account analytics",
      "Custom firm rule packs",
      "Slack / Discord alert integration",
      "Direct Slack support channel",
    ],
    missing: [],
  },
];

// ── How it works steps ────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Pick your firm & account",
    body: "Select from 13 verified rule packs — TopStep Combine, Apex EOD, MyFundedFutures, TradeDay. Rules are sourced directly from official help centers and updated when firms change terms.",
  },
  {
    n: "02",
    title: "Set your live account state",
    body: "Enter today's P&L and trailing room. Import your platform's CSV to auto-populate. FundedCore knows exactly how much room you have before the account-ending drawdown hit.",
  },
  {
    n: "03",
    title: "Run a pre-trade check",
    body: "Enter the instrument, size, and stop. The firewall calculates worst-case loss, checks every rule, and returns APPROVE / REDUCE / WAIT / BLOCK with a plain-English reason — before you click the buy button.",
  },
  {
    n: "04",
    title: "Review your behavior",
    body: "After the session, the behavioral engine finds your failure signature — revenge sizing, tilt windows, overtrading on red days — ranked by how much they've cost you in dollars.",
  },
];

// ── Testimonial-style stat ────────────────────────────────────────────────────
const STATS = [
  { v: "83%",  l: "of funded account failures are rule violations, not bad trading" },
  { v: "$500M+", l: "in challenge fees paid by retail traders every year" },
  { v: "13",   l: "firm rule packs — verified from official sources" },
  { v: "< 1s", l: "to get a pre-trade verdict before you size in" },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const FAQS = [
    {
      q: "Are the firm rules accurate?",
      a: "Rules are sourced directly from each firm's official help center and published terms. We document the source for every rule. When firms change terms (which they do — sometimes silently), Pro subscribers get priority updates. Free users should always double-check against the firm's current help center.",
    },
    {
      q: "Does FundedCore execute trades?",
      a: "No. FundedCore is decision-support software — read-only analysis. It does not connect to your broker, does not execute orders, and does not provide investment advice. It runs entirely in your browser.",
    },
    {
      q: "What platforms does CSV import support?",
      a: "Any platform that exports trades as CSV with date, instrument, size, and P&L columns. NinjaTrader, Tradovate, TradeLocker, Rithmic R Trader Pro, and Quantower all work. You can also use the custom column mapper for other formats.",
    },
    {
      q: "How does the news window detection work?",
      a: "FundedCore embeds the 2026 economic calendar for CPI, NFP, FOMC decisions, PCE, PPI, and Retail Sales. It checks your local time against Eastern Time event windows and alerts you automatically — no manual toggle needed.",
    },
    {
      q: "Is there a free trial?",
      a: "The Free tier is permanently free, not a trial. The full dashboard — firewall, behavioral engine, Monte Carlo — works for TopStep Combine 50K at no cost. Pro adds the full firm library, live news detection, and CSV import.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden font-body" style={{ background: "#020817", color: "#F0F4FF" }}>

      {/* ── Background atmosphere ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute rounded-full" style={{
          width: 900, height: 900, top: -360, right: -260,
          background: "radial-gradient(circle, rgba(59,130,246,.16), transparent 70%)",
          filter: "blur(80px)",
        }} />
        <div className="absolute rounded-full" style={{
          width: 750, height: 750, bottom: -320, left: -230,
          background: "radial-gradient(circle, rgba(124,58,237,.14), transparent 70%)",
          filter: "blur(80px)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: 0.6,
        }} />
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-sans text-lg font-bold tracking-wide">
          FUNDED<span style={{ color: "#3B82F6" }}>.</span>CORE
          <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: "#94A3B8" }}>Intelligence</span>
        </Link>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <Link href="/dashboard" className="hidden text-t2 transition hover:text-t1 md:inline" style={{ color: "#94A3B8" }}>Dashboard</Link>
          <Link href="/dashboard"
            className="rounded-md px-4 py-2 font-semibold text-white transition"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #7C3AED)", boxShadow: "0 4px 20px rgba(29,78,216,.40)" }}>
            Open App →
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ borderColor: "rgba(59,130,246,.25)", background: "rgba(59,130,246,.06)", color: "#60A5FA" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
          13 firm rule packs · verified June 2026
        </div>

        <h1 className="mx-auto mb-6 max-w-4xl font-sans text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Stop the trade that<br />
          <span style={{
            background: "linear-gradient(135deg, #F0F4FF 0%, #93C5FD 55%, #818CF8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            blows your account.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed" style={{ color: "#94A3B8" }}>
          FundedCore is the pre-trade risk firewall for funded futures traders. Check any trade against your
          firm&apos;s exact rules and your live account state — and get a clear verdict before you click Buy.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard"
            className="rounded-lg px-8 py-4 font-sans text-base font-bold text-white transition"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #7C3AED)", boxShadow: "0 6px 32px rgba(29,78,216,.45)" }}>
            Open the Free Dashboard →
          </Link>
          <a href="#how-it-works"
            className="rounded-lg border px-8 py-4 font-sans text-base font-medium transition hover:border-opacity-60"
            style={{ borderColor: "rgba(255,255,255,.12)", color: "#94A3B8" }}>
            See how it works
          </a>
        </div>

        {/* Firm badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: "#475569" }}>Works with</span>
          {FIRMS_SUPPORTED.map((f) => (
            <div key={f.name} className="rounded-md border px-3 py-1.5 font-mono text-[10px] transition"
              style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#94A3B8" }}>
              {f.name}
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y" style={{ borderColor: "rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 py-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.v} className="border-r px-6 py-4 last:border-r-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
              <div className="font-sans text-3xl font-bold" style={{ color: "#3B82F6" }}>{s.v}</div>
              <div className="mt-1 font-mono text-[10px] leading-snug" style={{ color: "#475569" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#3B82F6" }}>How it works</div>
        <h2 className="mb-16 font-sans text-4xl font-bold tracking-tight">Four steps to a clean account.</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border p-8 transition hover:-translate-y-1"
              style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(10,22,40,.6)", boxShadow: "0 4px 32px rgba(0,0,0,.3)" }}>
              <div className="mb-4 font-mono text-4xl font-bold" style={{ color: "rgba(59,130,246,.25)" }}>{s.n}</div>
              <h3 className="mb-3 font-sans text-lg font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Verdict demo ──────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(10,22,40,.7)" }}>
          <div className="border-b px-8 py-5 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ borderColor: "rgba(255,255,255,.06)", color: "#475569" }}>
            Pre-Trade Firewall — Live Demo
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            {/* Input side */}
            <div className="border-r p-8" style={{ borderColor: "rgba(255,255,255,.06)" }}>
              <div className="mb-6 font-mono text-xs uppercase tracking-wider" style={{ color: "#94A3B8" }}>Proposed Trade</div>
              {[
                ["Instrument", "NQ · E-mini Nasdaq-100"],
                ["Account", "TopStep Combine 50K"],
                ["Size", "3 contracts"],
                ["Stop", "25 points → $1,500 risk"],
                ["Today P&L", "−$620 (trailing room: $1,380)"],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between border-b py-2.5 font-mono text-xs" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <span style={{ color: "#475569" }}>{l}</span>
                  <span style={{ color: "#94A3B8" }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Verdict side */}
            <div className="p-8">
              <div className="mb-4 rounded-lg px-6 py-5 text-center" style={{ background: "#F59E0B" }}>
                <div className="font-sans text-3xl font-bold text-white">REDUCE</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-white opacity-80">Cut size to stay safe</div>
              </div>
              <p className="mb-5 text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                At 3 contracts, worst-case loss is <strong style={{ color: "#F0F4FF" }}>$1,575</strong> — exceeding your trailing room of{" "}
                <strong style={{ color: "#F0F4FF" }}>$1,380</strong>. Largest safe size is <strong style={{ color: "#10B981" }}>2 contracts</strong>.
              </p>
              {[
                ["worst_case_loss", "bad", "$1,575"],
                ["trailing_drawdown", "bad", "$1,380 remaining"],
                ["daily_loss_limit", "ok", "$380 left"],
                ["contract_cap", "ok", "3/5 max"],
                ["news_window", "ok", "clear"],
              ].map(([l, s, v]) => (
                <div key={l} className="flex items-center justify-between border-b py-2 font-mono text-[11px] last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <span style={{ color: "#475569" }}>{l}</span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[8.5px] uppercase ${s === "ok" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>
                      {s === "ok" ? "pass" : "fail"}
                    </span>
                    <span style={{ color: "#94A3B8" }}>{v}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#3B82F6" }}>Pricing</div>
        <h2 className="mb-4 font-sans text-4xl font-bold tracking-tight">Start free. Pay when it saves your account.</h2>
        <p className="mb-14 text-base" style={{ color: "#94A3B8" }}>The Free tier includes the full firewall. Pro unlocks every firm, live news detection, and CSV import.</p>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition hover:-translate-y-1 ${plan.highlight ? "ring-1 ring-[#3B82F6]/40" : ""}`}
              style={{
                borderColor: plan.highlight ? "rgba(59,130,246,.35)" : "rgba(255,255,255,.07)",
                background: plan.highlight ? "rgba(14,28,56,.90)" : "rgba(10,22,40,.60)",
                boxShadow: plan.highlight ? "0 0 60px rgba(59,130,246,.12), 0 4px 32px rgba(0,0,0,.4)" : "0 4px 24px rgba(0,0,0,.3)",
              }}>
              {plan.badge && (
                <div className="absolute -top-3 left-8 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-white"
                  style={{ background: "linear-gradient(135deg, #1D4ED8, #7C3AED)" }}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "#475569" }}>{plan.name}</div>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-sans text-5xl font-bold">{plan.price}</span>
                <span className="font-mono text-sm" style={{ color: "#475569" }}>{plan.period}</span>
              </div>

              <Link href={plan.ctaHref}
                className={`mb-8 rounded-lg py-3.5 text-center font-mono text-xs font-semibold uppercase tracking-wider text-white transition ${plan.highlight ? "" : "border"}`}
                style={plan.highlight
                  ? { background: "linear-gradient(135deg, #1D4ED8, #7C3AED)", boxShadow: "0 4px 24px rgba(29,78,216,.45)" }
                  : { borderColor: "rgba(255,255,255,.12)", color: "#94A3B8" }}>
                {plan.cta}
              </Link>

              <div className="space-y-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 font-mono text-[11px]" style={{ color: "#94A3B8" }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: "#10B981" }}>✓</span>
                    {f}
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 font-mono text-[11px]" style={{ color: "#475569" }}>
                    <span className="mt-0.5 flex-shrink-0">–</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#3B82F6" }}>FAQ</div>
        <h2 className="mb-10 font-sans text-3xl font-bold">Common questions.</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-xl border transition"
              style={{ borderColor: openFaq === i ? "rgba(59,130,246,.25)" : "rgba(255,255,255,.07)", background: "rgba(10,22,40,.6)" }}>
              <button className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="font-sans text-sm font-semibold">{faq.q}</span>
                <span className="ml-4 font-mono text-lg transition-transform"
                  style={{ color: "#3B82F6", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
              </button>
              {openFaq === i && (
                <div className="border-t px-6 pb-5 pt-4 font-mono text-[11px] leading-relaxed"
                  style={{ borderColor: "rgba(255,255,255,.06)", color: "#94A3B8" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-2xl border text-center" style={{ borderColor: "rgba(59,130,246,.20)", background: "rgba(14,28,56,.80)", boxShadow: "0 0 80px rgba(59,130,246,.08)" }}>
          <div className="px-8 py-16">
            <div className="mb-4 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#3B82F6" }}>Free forever</div>
            <h2 className="mb-4 font-sans text-4xl font-bold tracking-tight">
              Your next account violation<br />is the last one that was preventable.
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-base" style={{ color: "#94A3B8" }}>
              Open the dashboard, select your firm, enter your account state. Run a check in 30 seconds. Free — no sign-up required.
            </p>
            <Link href="/dashboard"
              className="inline-block rounded-lg px-10 py-4 font-sans text-base font-bold text-white transition"
              style={{ background: "linear-gradient(135deg, #1D4ED8, #7C3AED)", boxShadow: "0 6px 40px rgba(29,78,216,.50)" }}>
              Open FundedCore — Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t px-6 py-8" style={{ borderColor: "rgba(255,255,255,.06)" }}>
        <div className="mx-auto max-w-6xl font-mono text-[10px] leading-relaxed" style={{ color: "#475569" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-sans font-bold" style={{ color: "#94A3B8" }}>
              FUNDED<span style={{ color: "#3B82F6" }}>.</span>CORE
            </span>
            <span>
              FundedCore is decision-support software — not a broker, no trade execution, no financial advice.
              Rule values are sourced from public firm documentation and may not reflect current terms. Always verify directly with your firm.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
