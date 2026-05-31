"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import EquityChart from "@/components/EquityChart";
import {
  FIRMS, INSTRUMENTS, generateJournal, parseCSV, CSV_TEMPLATE,
  expectancy, groupBy, hourBucket, equitySeries, behaviorSignatures, preTradeCheck, fmtMoney,
  type Trade, type CheckResult, type Verdict,
} from "@/lib/engine";

const SCENARIOS: Record<string, { todayPnL: number; trailingRoom: number; daysTraded: number }> = {
  topstep50: { todayPnL: -420, trailingRoom: 640, daysTraded: 3 },
  apex100: { todayPnL: -180, trailingRoom: 1450, daysTraded: 1 },
  tpt50: { todayPnL: -90, trailingRoom: 980, daysTraded: 4 },
};
const VCOLOR: Record<Verdict, string> = { APPROVE: "#2ADB8A", REDUCE: "#E8B84B", WAIT: "#E8B84B", BLOCK: "#E85050" };
const VSUB: Record<Verdict, string> = { APPROVE: "Cleared to take", REDUCE: "Cut size to stay safe", WAIT: "Hold — condition active", BLOCK: "Do not take this trade" };
const TABS = [["check", "01 · Pre-Trade Firewall"], ["behavior", "02 · Behavioral Engine"], ["edge", "03 · Edge Analytics"], ["journal", "04 · Journal"]] as const;

export default function Dashboard() {
  const [journal, setJournal] = useState<Trade[]>(() => generateJournal());
  const [acct, setAcct] = useState<string>("topstep50");
  const [tab, setTab] = useState<string>("check");
  const [inst, setInst] = useState<string>("NQ");
  const [size, setSize] = useState<number>(3);
  const [stop, setStop] = useState<number>(14);
  const [dir, setDir] = useState<string>("Long");
  const [news, setNews] = useState<boolean>(false);
  const [tilt, setTilt] = useState<boolean>(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [csvName, setCsvName] = useState<string>("");

  useEffect(() => {
    try {
      const j = localStorage.getItem("fc_journal");
      if (j) { const rows = JSON.parse(j); if (Array.isArray(rows) && rows.length) { setJournal(rows); setCsvName("(your imported journal)"); } }
      const a = localStorage.getItem("fc_acct");
      if (a && FIRMS[a]) setAcct(a);
    } catch {}
  }, []);

  const firm = FIRMS[acct];
  const sc = SCENARIOS[acct] || { todayPnL: 0, trailingRoom: firm.trailingDD, daysTraded: 0 };

  const all = useMemo(() => expectancy(journal), [journal]);
  const setups = useMemo(() => groupBy(journal, (t) => t.setup).sort((a, b) => b.exp - a.exp), [journal]);
  const hours = useMemo(() => groupBy(journal, (t) => hourBucket(t.hour)).sort((a, b) => b.exp - a.exp), [journal]);
  const sigs = useMemo(() => behaviorSignatures(journal), [journal]);
  const eq = useMemo(() => equitySeries(journal), [journal]);

  function runCheck() {
    setResult(preTradeCheck(firm, sc, { instrument: inst, size: Math.max(1, size || 1), stop: Math.max(1, stop || 1), news, tilt }));
  }
  function onCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const rows = parseCSV(String(r.result || "")); if (rows.length) { setJournal(rows); setCsvName(f.name); try { localStorage.setItem("fc_journal", JSON.stringify(rows)); } catch {} } };
    r.readAsText(f);
  }

  // cockpit
  const dailyRoom = firm.dailyLoss == null ? null : Math.max(0, firm.dailyLoss - Math.max(0, -sc.todayPnL));
  const dailyPct = firm.dailyLoss == null ? 100 : (dailyRoom! / firm.dailyLoss) * 100;
  const trailPct = (sc.trailingRoom / firm.trailingDD) * 100;
  const minPct = firm.minDays === 0 ? 100 : Math.min(100, (sc.daysTraded / firm.minDays) * 100);
  const col = (p: number) => (p > 50 ? "#2ADB8A" : p > 25 ? "#E8B84B" : "#E85050");
  const gauges = [
    { l: "Daily loss room", v: firm.dailyLoss == null ? "n/a" : "$" + dailyRoom, p: dailyPct, c: col(dailyPct), s: firm.dailyLoss == null ? "no daily limit" : "of $" + firm.dailyLoss },
    { l: "Trailing drawdown", v: "$" + sc.trailingRoom, p: trailPct, c: col(trailPct), s: "away from breach" },
    { l: "Today P&L", v: (sc.todayPnL >= 0 ? "+" : "") + "$" + sc.todayPnL, p: 50, c: sc.todayPnL >= 0 ? "#2ADB8A" : "#E85050", s: "realized" },
    { l: "Min trading days", v: sc.daysTraded + " / " + firm.minDays, p: minPct, c: minPct >= 100 ? "#2ADB8A" : "#7AB8D4", s: firm.minDays === 0 ? "no minimum" : Math.max(0, firm.minDays - sc.daysTraded) + " left" },
    { l: "Account status", v: "ALIVE", p: 100, c: "#2ADB8A", s: firm.name.split(" ")[0] + " · funded" },
  ];

  // edge verdict
  const disciplined = eq.B[eq.B.length - 1] || 0;
  let edge: { icon: string; col: string; bg: string; title: string; msg: string };
  if (all.exp > 15) edge = { icon: "✓", col: "#2ADB8A", bg: "rgba(42,219,138,.14)", title: "Demonstrated edge: YES", msg: `Across ${all.n} trades your overall expectancy is <b style="color:#2ADB8A">${fmtMoney(all.exp)}/trade</b>. The edge is real — protect it by cutting the red rows below.` };
  else if (all.exp > 0) edge = { icon: "≈", col: "#E8B84B", bg: "rgba(232,184,75,.14)", title: "Demonstrated edge: MARGINAL", msg: `Overall expectancy is only <b style="color:#E8B84B">${fmtMoney(all.exp)}/trade</b> across ${all.n} trades. You're near breakeven — cut the red rows below to tip it positive.` };
  else if (disciplined > 0) edge = { icon: "!", col: "#E8B84B", bg: "rgba(232,184,75,.14)", title: "Demonstrated edge: BURIED", msg: `You're net <b style="color:#E85050">${fmtMoney(all.sum)}</b> — but that isn't a missing edge, it's a leak. Your positive setups are real; your <b>${eq.negSetups.join(" &amp; ")}</b> trades are bleeding them out. Cut those and the <b>same history</b> flips from <b style="color:#E85050">${fmtMoney(all.sum)}</b> to <b style="color:#2ADB8A">${fmtMoney(disciplined)}</b>.` };
  else edge = { icon: "✕", col: "#E85050", bg: "rgba(232,80,80,.14)", title: "Demonstrated edge: NONE YET", msg: `Overall expectancy is <b style="color:#E85050">${fmtMoney(all.exp)}/trade</b> and discipline alone doesn't flip it positive. Honestly: no proven edge here yet. Priority is finding one positive-expectancy setup — not trading more.` };

  const actOf = (e: number) => (e > 10 ? "scale" : e < 0 ? "cut" : "hold");
  const actCls: Record<string, string> = { scale: "text-grn bg-grn/10", cut: "text-red bg-red/10", hold: "text-t2 bg-white/5" };

  return (
    <main className="font-body text-t1">
      <header className="sticky top-0 z-40 border-b border-bd bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-[62px] max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-sans text-[17px] font-bold tracking-wide">FUNDED<span className="text-acc">.</span>CORE<span className="ml-2 font-mono text-[8.5px] uppercase tracking-[0.22em] text-t2">Intelligence</span></Link>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 uppercase tracking-[0.16em] text-grn"><span className="h-1.5 w-1.5 rounded-full bg-grn pulse" />Live</span>
            <select value={acct} onChange={(e) => { setAcct(e.target.value); setResult(null); try { localStorage.setItem("fc_acct", e.target.value); } catch {} }} className="rounded border border-bd bg-panel px-3 py-2 font-mono text-[11px] text-t1 outline-none">
              {Object.keys(FIRMS).map((k) => (<option key={k} value={k}>{FIRMS[k].name}</option>))}
            </select>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <div className="py-10">
          <div className="mb-3 flex items-center gap-2.5 font-mono text-[9px] uppercase tracking-[0.3em] text-acc"><span className="h-px w-6 bg-acc" />Trader Operating System</div>
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Keep the account alive.<br /><span className="bg-gradient-to-r from-white to-acc bg-clip-text text-transparent">Then make it profitable.</span></h1>
        </div>

        {/* COCKPIT */}
        <div className="grid grid-cols-2 gap-[2px] border border-bd bg-bd md:grid-cols-5">
          {gauges.map((g) => (
            <div key={g.l} className="bg-panel p-4">
              <div className="mb-2 flex items-baseline justify-between"><span className="font-mono text-[8px] uppercase tracking-wider text-t2">{g.l}</span><span className="font-mono text-[13px] font-medium" style={{ color: g.c }}>{g.v}</span></div>
              <div className="h-1 overflow-hidden rounded bg-white/10"><div className="h-full rounded transition-all duration-500" style={{ width: Math.max(2, Math.min(100, g.p)) + "%", background: g.c }} /></div>
              <div className="mt-2 font-mono text-[7.5px] uppercase tracking-wide text-t3">{g.s}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-t3">Live account snapshot · firewall evaluates every trade against this state. Rule values are illustrative.</p>

        {/* TABS */}
        <div className="mt-8 flex flex-wrap gap-[2px] border-b border-bd">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider transition ${tab === id ? "border-acc text-white" : "border-transparent text-t2 hover:text-t1"}`}>{label}</button>
          ))}
        </div>

        {/* CHECK */}
        {tab === "check" && (
          <div className="fade py-8">
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">Enter the trade you&apos;re about to take. FundedCore checks it against your firm&apos;s rules and live account state, then returns a verdict — with the binding rule and the room you have left.</p>
            <div className="grid gap-5 md:grid-cols-[420px_1fr]">
              <div className="rounded-lg border border-bd bg-panel">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4"><h3 className="font-sans text-[15px] font-semibold">Proposed Trade</h3><span className="font-mono text-[8px] uppercase tracking-wider text-t2">{firm.name}</span></div>
                <div className="p-5">
                  <Field label="Instrument"><select value={inst} onChange={(e) => setInst(e.target.value)} className="fcin">{Object.keys(INSTRUMENTS).map((k) => (<option key={k} value={k}>{INSTRUMENTS[k].name}</option>))}</select></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Size (contracts)"><input type="number" value={size} min={1} onChange={(e) => setSize(+e.target.value)} className="fcin" /></Field>
                    <Field label="Stop (points)"><input type="number" value={stop} min={1} onChange={(e) => setStop(+e.target.value)} className="fcin" /></Field>
                  </div>
                  <Field label="Direction"><select value={dir} onChange={(e) => setDir(e.target.value)} className="fcin"><option>Long</option><option>Short</option></select></Field>
                  <div className="mb-4 flex flex-wrap gap-2.5">
                    <Toggle on={news} set={setNews}>News window</Toggle>
                    <Toggle on={tilt} set={setTilt}>After 2 losses today</Toggle>
                  </div>
                  <button onClick={runCheck} className="w-full rounded-md bg-acc py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-bg transition hover:bg-[#9fd0e6]">Run Pre-Trade Check</button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: result ? VCOLOR[result.verdict] : "rgba(140,190,210,0.09)" }}>
                {!result ? (
                  <div className="px-6 py-20 text-center font-mono text-xs tracking-wide text-t3">Run a check to see the verdict.</div>
                ) : (
                  <>
                    <div className="px-6 py-6 text-center" style={{ background: VCOLOR[result.verdict], color: "#021018" }}>
                      <div className="font-sans text-4xl font-bold">{result.verdict}</div>
                      <div className="mt-2 font-mono text-[11px] tracking-wide opacity-80">{VSUB[result.verdict]}</div>
                    </div>
                    <div className="px-6 py-5">
                      <p className="mb-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: result.reason }} />
                      {result.verdict === "REDUCE" && (<div className="flex justify-between border-b border-white/5 py-2.5 font-mono text-[11.5px]"><span className="text-t2">recommended_size</span><span className="text-white">{result.safeSize} contracts</span></div>)}
                      {result.checks.map((c, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/5 py-2.5 font-mono text-[11.5px] last:border-0">
                          <span className="text-t2">{c.l}</span>
                          <span className="flex items-center gap-2"><span className={`rounded px-2 py-0.5 text-[8.5px] uppercase ${c.s === "ok" ? "bg-grn/10 text-grn" : c.s === "warn" ? "bg-amb/10 text-amb" : "bg-red/10 text-red"}`}>{c.s === "ok" ? "pass" : c.s === "warn" ? "hold" : "fail"}</span><span className="text-t1">{c.v}</span></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BEHAVIOR */}
        {tab === "behavior" && (
          <div className="fade py-8">
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">From your journal, the behavioral engine finds your failure signature — the patterns that destroy accounts — ranked by what they actually cost you.</p>
            {sigs.map((s, i) => (
              <div key={i} className="relative mb-3.5 overflow-hidden rounded-lg border border-bd bg-panel p-6">
                <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: s.sev === "high" ? "#E85050" : s.sev === "med" ? "#E8B84B" : "#2ADB8A" }} />
                <div className="mb-2.5 flex items-start justify-between gap-4">
                  <div className="font-sans text-base font-semibold">{s.name}</div>
                  <div className={`whitespace-nowrap rounded px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-wider ${s.sev === "high" ? "bg-red/10 text-red" : s.sev === "med" ? "bg-amb/10 text-amb" : "bg-grn/10 text-grn"}`}>{s.sev} severity</div>
                </div>
                <p className="mb-3.5 text-sm leading-relaxed text-t2" dangerouslySetInnerHTML={{ __html: s.desc }} />
                <div className="flex flex-wrap gap-7">{s.stats.map((st, j) => (<div key={j}><div className="font-mono text-xl font-medium text-white">{st[0]}</div><div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-t3">{st[1]}</div></div>))}</div>
              </div>
            ))}
            {!sigs.length && <div className="py-16 text-center font-mono text-xs text-t3">No destructive patterns detected.</div>}
          </div>
        )}

        {/* EDGE */}
        {tab === "edge" && (
          <div className="fade py-8">
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">Discipline keeps you alive; edge makes you money. Your real expectancy by setup and time — and what your equity becomes if you cut your negative-expectancy trades.</p>
            <div className="mb-5 flex items-center gap-5 rounded-lg border p-6" style={{ borderColor: edge.col + "55" }}>
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full font-sans text-3xl font-bold" style={{ background: edge.bg, color: edge.col }}>{edge.icon}</div>
              <div><h4 className="mb-1 font-sans text-lg font-semibold">{edge.title}</h4><p className="text-sm leading-relaxed text-t2" dangerouslySetInnerHTML={{ __html: edge.msg }} /></div>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-[2px] border border-bd bg-bd md:grid-cols-4">
              {[["Trades analyzed", String(all.n), "#D8ECF5"], ["Win rate", (all.winRate * 100).toFixed(0) + "%", "#D8ECF5"], ["Expectancy / trade", fmtMoney(all.exp), all.exp >= 0 ? "#2ADB8A" : "#E85050"], ["Net P&L", fmtMoney(all.sum), all.sum >= 0 ? "#2ADB8A" : "#E85050"]].map((b) => (
                <div key={b[0]} className="bg-panel p-4.5 p-4"><div className="font-mono text-2xl font-medium" style={{ color: b[2] }}>{b[1]}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-t2">{b[0]}</div></div>
              ))}
            </div>
            <div className="mb-5 rounded-lg border border-bd bg-panel">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4"><h3 className="font-sans text-[15px] font-semibold">Equity — actual vs. discipline</h3><span className="font-mono text-[8px] uppercase tracking-wider text-t2">Counterfactual</span></div>
              <div className="p-5"><EquityChart trades={journal} />
                <div className="mt-3.5 flex flex-wrap gap-5 font-mono text-[10px] text-t2"><span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded" style={{ background: "#7E9DB5" }} />Actual equity</span><span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded" style={{ background: "#2ADB8A" }} />If you cut negative-expectancy trades</span></div>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <EdgeTable title="Edge by Setup" rows={setups} actOf={actOf} actCls={actCls} />
              <EdgeTable title="Edge by Time of Day" rows={hours} actOf={actOf} actCls={actCls} />
            </div>
          </div>
        )}

        {/* JOURNAL */}
        {tab === "journal" && (
          <div className="fade py-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-sm text-t2">The journal powering the analytics. Import your own to run it on real trades.</p>
              <div className="flex items-center gap-3">
                <a href={"data:text/csv;charset=utf-8," + encodeURIComponent(CSV_TEMPLATE)} download="fundedcore-template.csv" className="font-mono text-[10px] uppercase tracking-wider text-acc hover:underline">Download template</a>
                <label className="cursor-pointer rounded-md border border-bd px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-t1 hover:border-acc">
                  Import CSV<input type="file" accept=".csv" className="hidden" onChange={onCSV} />
                </label>
                {csvName && <span className="font-mono text-[10px] text-grn">✓ {csvName}</span>}
                {csvName && <button onClick={() => { setJournal(generateJournal()); setCsvName(""); try { localStorage.removeItem("fc_journal"); } catch {} }} className="font-mono text-[10px] text-t2 hover:text-t1">reset sample</button>}
              </div>
            </div>
            <div className="max-h-[560px] overflow-auto rounded-lg border border-bd bg-panel">
              <table className="w-full font-mono text-xs">
                <thead className="sticky top-0 bg-panel"><tr className="text-left text-t2">
                  {["ID", "Date", "Time", "Inst", "Setup", "Dir", "Size", "R", "P&L"].map((h) => (<th key={h} className="border-b border-bd px-3 py-2.5 text-[8.5px] uppercase tracking-wider font-medium">{h}</th>))}
                </tr></thead>
                <tbody>
                  {journal.slice().reverse().map((t) => (
                    <tr key={t.id}>
                      <td className="border-b border-white/5 px-3 py-2.5 text-t2">#{t.id}</td>
                      <td className="border-b border-white/5 px-3 py-2.5 text-t2">{t.date}</td>
                      <td className="border-b border-white/5 px-3 py-2.5 text-t2">{String(t.hour).padStart(2, "0")}:00</td>
                      <td className="border-b border-white/5 px-3 py-2.5">{t.instrument}</td>
                      <td className="border-b border-white/5 px-3 py-2.5">{t.setup}{t.revenge && <span className="ml-1.5 rounded bg-red/10 px-1.5 py-0.5 text-[8px] uppercase text-red">revenge</span>}</td>
                      <td className="border-b border-white/5 px-3 py-2.5 text-t2">{t.dir}</td>
                      <td className="border-b border-white/5 px-3 py-2.5 text-right text-t2">{t.size}</td>
                      <td className={`border-b border-white/5 px-3 py-2.5 text-right ${t.R >= 0 ? "text-grn" : "text-red"}`}>{t.R > 0 ? "+" : ""}{t.R}R</td>
                      <td className={`border-b border-white/5 px-3 py-2.5 text-right ${t.pnl >= 0 ? "text-grn" : "text-red"}`}>{fmtMoney(t.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-bd py-7">
        <div className="mx-auto max-w-6xl px-6 font-mono text-[10px] leading-relaxed text-t3">
          FundedCore is decision-support software — not a broker, no trade execution, no financial advice. Rule values and the sample journal are illustrative, not official firm terms or real trades. No tool can guarantee profitability; trading leveraged products carries substantial risk of loss.
        </div>
      </footer>

      <style>{`.fcin{width:100%;background:#00020A;color:#D8ECF5;border:1px solid rgba(140,190,210,.09);border-radius:5px;padding:11px 12px;font-family:"JetBrains Mono",monospace;font-size:13px;outline:none}.fcin:focus{border-color:#7AB8D4}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="mb-4"><label className="mb-1.5 block font-mono text-[9px] uppercase tracking-wider text-t2">{label}</label>{children}</div>);
}
function Toggle({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: React.ReactNode }) {
  return (<div onClick={() => set(!on)} className={`cursor-pointer select-none rounded-full border px-3.5 py-2 font-mono text-[10px] transition ${on ? "border-amb bg-amb font-semibold text-bg" : "border-bd text-t2"}`}>{children}</div>);
}
function EdgeTable({ title, rows, actOf, actCls }: { title: string; rows: { key: string; n: number; winRate: number; exp: number }[]; actOf: (e: number) => string; actCls: Record<string, string> }) {
  return (
    <div className="rounded-lg border border-bd bg-panel">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4"><h3 className="font-sans text-[15px] font-semibold">{title}</h3><span className="font-mono text-[8px] uppercase tracking-wider text-t2">Expectancy / trade</span></div>
      <table className="w-full font-mono text-xs">
        <thead><tr className="text-left text-t2">{["Group", "N", "Win%", "Exp/trade", "Action"].map((h) => (<th key={h} className="border-b border-bd px-3 py-2.5 text-[8.5px] uppercase tracking-wider font-medium">{h}</th>))}</tr></thead>
        <tbody>
          {rows.map((s) => { const a = actOf(s.exp); return (
            <tr key={s.key}>
              <td className="border-b border-white/5 px-3 py-2.5 text-t1">{s.key}</td>
              <td className="border-b border-white/5 px-3 py-2.5 text-t2">{s.n}</td>
              <td className="border-b border-white/5 px-3 py-2.5 text-t2">{(s.winRate * 100).toFixed(0)}%</td>
              <td className={`border-b border-white/5 px-3 py-2.5 ${s.exp >= 0 ? "text-grn" : "text-red"}`}>{fmtMoney(s.exp)}</td>
              <td className="border-b border-white/5 px-3 py-2.5"><span className={`rounded px-2 py-0.5 text-[8.5px] uppercase ${actCls[a]}`}>{a}</span></td>
            </tr>); })}
        </tbody>
      </table>
    </div>
  );
}
