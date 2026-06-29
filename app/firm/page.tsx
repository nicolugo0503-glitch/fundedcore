"use client";
// FundedCore for Prop Firms (B2B). A live window into the cohort moat: how many
// accounts FundedCore tracks, the discipline distribution, and the share of traders
// who are statistically about to blow up — the exact churn signal firms can't see.
import { useEffect, useState } from "react";

type Cohort = { count: number; anchors: Record<string, number[]> };

export default function FirmPage() {
  const [c, setC] = useState<Cohort | null>(null);
  useEffect(() => {
    fetch("/api/benchmark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cohort" }) })
      .then((r) => r.json()).then((j) => setC({ count: j.count || 0, anchors: j.anchors || {} })).catch(() => setC({ count: 0, anchors: {} }));
  }, []);

  const live = (c?.count ?? 0) >= 30;
  const comp = c?.anchors?.composure;
  const breach = c?.anchors?.breachProb;
  const medianComposure = comp ? Math.round(comp[2]) : 62;
  const medianBreach = breach ? Math.round(breach[2] * 100) : 14;

  const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div style={{ background: "#0E1216", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "22px 24px" }}>
      <div style={{ fontSize: 13, letterSpacing: 2, color: "#7B8694", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 44, fontWeight: 800, color: "#EAF0F7", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#97A1B0", marginTop: 4 }}>{sub}</div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(900px 500px at 50% 0%, #0E1A18, #070A0E 60%)", color: "#EAF0F7", fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif", padding: "0 22px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "28px 0" }}>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>Funded<span style={{ color: "#2BE3B0" }}>Core</span></span>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#7B8694", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "4px 10px" }}>FOR PROP FIRMS</span>
        </header>

        <section style={{ paddingTop: 30, paddingBottom: 40 }}>
          <h1 style={{ fontSize: 52, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1.5, maxWidth: 760 }}>
            Stop losing traders to <span style={{ color: "#EF4444" }}>tilt</span>.<br />Keep them paying.
          </h1>
          <p style={{ fontSize: 19, color: "#97A1B0", marginTop: 20, maxWidth: 620, lineHeight: 1.5 }}>
            FundedCore reads your traders' behavior across firms and predicts who's about to blow up — before they do. Lower churn, higher pass rates, longer-paying funded accounts. The discipline layer your evaluation can't measure.
          </p>
          <div style={{ display: "inline-flex", gap: 8, marginTop: 22, alignItems: "center", fontSize: 13, color: live ? "#2BE3B0" : "#7B8694" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: live ? "#2BE3B0" : "#7B8694" }} />
            {c == null ? "Loading cohort…" : live ? `Live across ${c.count.toLocaleString()} tracked accounts` : "Baseline cohort — live data accruing"}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 48 }}>
          <Stat label="ACCOUNTS TRACKED" value={c ? c.count.toLocaleString() : "—"} sub={live ? "real synced accounts" : "growing daily"} />
          <Stat label="MEDIAN DISCIPLINE" value={`${medianComposure}/100`} sub="composure across the cohort" />
          <Stat label="MEDIAN BREACH RISK" value={`${medianBreach}%`} sub="5-day blow-up probability" />
          <Stat label="THE SIGNAL" value="Behavior" sub="not strategy — what actually fails them" />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginBottom: 48 }}>
          {[
            ["Predict the blow-up", "A breach-probability model on each trader's real P&L flags accounts heading for a violation days ahead — so you can intervene instead of refund."],
            ["Fast-track the disciplined", "A trusted FundedScore lets you scale or discount funding for traders whose behavior proves they'll keep the account. Less risk, better retention."],
            ["Cut challenge churn", "Traders who survive longer buy more challenges and stay funded longer. FundedCore keeps them alive — and keeps them yours."],
          ].map(([h, b]) => (
            <div key={h} style={{ background: "#0E1216", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{h}</div>
              <div style={{ fontSize: 14.5, color: "#97A1B0", lineHeight: 1.55 }}>{b}</div>
            </div>
          ))}
        </section>

        <section style={{ textAlign: "center", background: "linear-gradient(180deg,rgba(43,227,176,.08),transparent)", border: "1px solid rgba(43,227,176,.2)", borderRadius: 20, padding: "44px 24px" }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Want this on your traders?</div>
          <div style={{ fontSize: 16, color: "#97A1B0", marginTop: 10, maxWidth: 520, marginInline: "auto" }}>Pilot FundedCore's discipline + breach-prediction layer for your firm. Per-seat or revenue-share.</div>
          <a href="mailto:nicolugo0503@gmail.com?subject=FundedCore%20for%20Prop%20Firms" style={{ display: "inline-block", marginTop: 22, background: "#2BE3B0", color: "#04110D", fontWeight: 800, fontSize: 15, padding: "13px 26px", borderRadius: 12, textDecoration: "none" }}>Talk to us →</a>
        </section>

        <p style={{ fontSize: 12, color: "#5C6675", marginTop: 30, textAlign: "center" }}>Cohort figures are anonymized and aggregate; until enough accounts sync, a realistic baseline distribution is shown. No trader PII is ever exposed.</p>
      </div>
    </main>
  );
}
