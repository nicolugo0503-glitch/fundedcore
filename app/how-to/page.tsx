// Public how-to: getting your trade history into FundedCore from TopStep & Tradovate.
// Two paths per firm — one-click Connect (API) and CSV upload. Linkable in outreach.
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "How to import your trades — FundedCore",
  description: "Two ways to get your TopStep or Tradovate trade history into FundedCore: one-click Connect, or upload a CSV. Free, ~2 minutes.",
  openGraph: { title: "Import your trades into FundedCore", description: "TopStep & Tradovate — connect or upload a CSV in ~2 minutes." },
};

const c = { bg: "#070A0E", card: "#0E1216", line: "rgba(255,255,255,.09)", t1: "#EAF0F7", t2: "#97A1B0", t3: "#7B8694", acc: "#2BE3B0", blue: "#3B82F6" };

function Step({ n, children }: { n: number; children: any }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "10px 0" }}>
      <div style={{ flex: "0 0 28px", width: 28, height: 28, borderRadius: 999, background: "rgba(43,227,176,.12)", border: "1px solid rgba(43,227,176,.35)", color: c.acc, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
      <div style={{ fontSize: 15.5, color: c.t1, lineHeight: 1.55, paddingTop: 2 }}>{children}</div>
    </div>
  );
}
function Card({ title, tag, children }: { title: string; tag: string; children: any }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 18, padding: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: c.t1 }}>{title}</div>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: c.acc, border: "1px solid rgba(43,227,176,.3)", borderRadius: 999, padding: "3px 9px" }}>{tag}</span>
      </div>
      {children}
    </div>
  );
}

export default function HowTo() {
  return (
    <main style={{ minHeight: "100vh", background: `radial-gradient(900px 500px at 50% 0%, #0E1A18, ${c.bg} 60%)`, color: c.t1, fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif", padding: "0 20px 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ padding: "26px 0" }}>
          <a href="/" style={{ fontWeight: 900, fontSize: 22, textDecoration: "none", color: c.t1 }}>Funded<span style={{ color: c.acc }}>Core</span></a>
        </header>

        <section style={{ paddingTop: 24, paddingBottom: 28 }}>
          <h1 style={{ fontSize: 44, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1.2, maxWidth: 700 }}>Get your trades into FundedCore in ~2 minutes</h1>
          <p style={{ fontSize: 18, color: c.t2, marginTop: 16, maxWidth: 640, lineHeight: 1.5 }}>
            Two ways in. <b style={{ color: c.t1 }}>Connect</b> is fastest (no file). <b style={{ color: c.t1 }}>Upload a CSV</b> pulls your full history. Either one makes every tool — your Score, the Mirror, breach odds — read your real account. It’s free.
          </p>
        </section>

        {/* TOPSTEP */}
        <h2 style={{ fontSize: 15, letterSpacing: 3, color: c.t3, fontWeight: 800, margin: "28px 0 14px" }}>TOPSTEP (TopstepX)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          <Card title="Connect" tag="FASTEST · NO FILE">
            <Step n={1}>In TopstepX: <b>Settings → API → Link Account → Generate key</b>. (Requires the ProjectX API add-on.)</Step>
            <Step n={2}>In FundedCore: <b>Broker Link → TopStep</b>. Paste your TopstepX <b>username</b> + <b>API key</b> → <b>Connect</b>.</Step>
            <Step n={3}>Pick your active account → tap <b>Sync my account</b>. Done — every module now reads it.</Step>
          </Card>
          <Card title="Upload a CSV" tag="FULL HISTORY">
            <Step n={1}>Log in to TopstepX → open the <b>Trades</b> tab.</Step>
            <Step n={2}>Click <b>Export</b> (bottom-right) → choose your date range → save the <b>.CSV</b>.</Step>
            <Step n={3}>In FundedCore: <b>Journal &amp; Score → Upload CSV</b> → pick the file. Every tool updates.</Step>
          </Card>
        </div>

        {/* TRADOVATE */}
        <h2 style={{ fontSize: 15, letterSpacing: 3, color: c.t3, fontWeight: 800, margin: "34px 0 14px" }}>TRADOVATE (Apex, Tradeify, TPT, Lucid, FundedNext, TradeDay…)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          <Card title="Connect" tag="LIVE FEED">
            <Step n={1}>In FundedCore: <b>Broker Link → Tradovate</b>.</Step>
            <Step n={2}>Enter your <b>Tradovate username + password</b> (sent once for a token, never stored) → <b>Connect</b>.</Step>
            <Step n={3}>You’ll see live balance, positions and Distance-to-Breach. For your full trade history, use the CSV path →</Step>
          </Card>
          <Card title="Upload a CSV" tag="FULL HISTORY">
            <Step n={1}>In Tradovate: open <b>Reports</b> → the <b>Orders</b> tab (not Performance).</Step>
            <Step n={2}>Select your date range/filters → <b>Download Report</b> → choose <b>CSV</b>. (Run after 5–6pm ET for settled data.)</Step>
            <Step n={3}>In FundedCore: <b>Journal &amp; Score → Upload CSV</b> → pick the file.</Step>
          </Card>
        </div>

        <div style={{ background: "rgba(245,166,35,.08)", border: "1px solid rgba(245,166,35,.28)", borderRadius: 14, padding: 18, marginTop: 26, fontSize: 14.5, color: c.t2 }}>
          <b style={{ color: c.t1 }}>Privacy:</b> API keys and passwords are sent once to fetch a token and are <b>never stored</b>. CSVs are parsed in your browser. FundedCore only ever reads — and (if you arm the Guardian) closes — never opens trades.
        </div>

        <section style={{ textAlign: "center", marginTop: 40 }}>
          <a href="/suite" style={{ display: "inline-block", background: c.acc, color: "#04110D", fontWeight: 800, fontSize: 15, padding: "14px 30px", borderRadius: 12, textDecoration: "none" }}>Open FundedCore →</a>
          <div style={{ fontSize: 13, color: c.t3, marginTop: 12 }}>Stuck on a step? The exact buttons move sometimes — search “export trades” inside your platform, or ask us.</div>
        </section>
      </div>
    </main>
  );
}
