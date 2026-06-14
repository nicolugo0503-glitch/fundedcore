"use client";
import { useMemo, useState } from "react";
import { type Profile } from "../../lib/profile";
import { INSTRUMENTS } from "../../lib/firms";
import { gateCheck, type ProposedTrade, type GateVerdict } from "../../lib/gate";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VERDICT_META: Record<GateVerdict["verdict"], { color: string; glow: string; label: string }> = {
  GO: { color: "var(--grn)", glow: "color-mix(in srgb, var(--grn) 22%, transparent)", label: "Take it" },
  CAUTION: { color: "var(--amb,#f5a623)", glow: "color-mix(in srgb, var(--amb,#f5a623) 22%, transparent)", label: "Only if textbook" },
  SKIP: { color: "var(--red)", glow: "color-mix(in srgb, var(--red) 22%, transparent)", label: "Don't take it" },
};

export function GateTab({ profile }: { profile: Profile }) {
  const now = new Date();
  const [symbol, setSymbol] = useState(profile.settings.instrument || "MNQ");
  const [size, setSize] = useState(1);
  const [stop, setStop] = useState(profile.settings.defaultStop || 20);
  const [useNow, setUseNow] = useState(true);
  const [dow, setDow] = useState(now.getUTCDay());
  const [hour, setHour] = useState(now.getUTCHours());
  const [tradesToday, setTradesToday] = useState(0);
  const [pnlToday, setPnlToday] = useState(0);
  const [losses, setLosses] = useState(0);
  const [acctId, setAcctId] = useState(profile.accounts[0]?.id || "");

  const symbols = useMemo(() => {
    const s = new Set<string>(Object.keys(INSTRUMENTS));
    profile.trades.forEach((t) => t.symbol && s.add(t.symbol));
    return [...s];
  }, [profile.trades]);

  if (!profile.trades.length) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Pre-trade gate" title="Should I take this trade?" sub="Runs your own history against the trade you're about to take — before you take it." />
        <EmptyState icon="shield" title="No history yet" body="The gate checks a proposed trade against your real patterns. Upload your trades and it comes alive." />
      </div>
    );
  }

  const account = profile.accounts.find((a) => a.id === acctId) || null;
  const proposed: ProposedTrade = {
    symbol,
    dow: useNow ? now.getUTCDay() : dow,
    hour: useNow ? now.getUTCHours() : hour,
    size, stopPts: stop, tradesToday, pnlToday, consecutiveLosses: losses,
  };
  const v = gateCheck(profile.trades, proposed, {
    maxTradesPerDay: profile.settings.maxTradesPerDay,
    dailyLossStop: profile.settings.dailyLossStop,
    account,
  });
  const meta = VERDICT_META[v.verdict];
  const facts = `Proposed: ${size} ${symbol} @ ${stop}pt stop on a ${DOW[proposed.dow]} ${String(proposed.hour).padStart(2,"0")}:00 UTC, trade #${tradesToday+1} today, ${usd(pnlToday)} so far, ${losses} losses in a row. Verdict: ${v.verdict} (score ${v.score}). Flags: ${v.reasons.map(r=>r.title).join("; ")}.`;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Pre-trade gate" title="Should I take this trade?" sub="Your leak, breach and edge engines fired BEFORE the trade — a real-time go / no-go tied to your own track record, not generic advice." />

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5 items-start">
        {/* Inputs */}
        <Panel title="The trade you're about to take" icon="target">
          <div className="grid sm:grid-cols-2 gap-3">
            <label><span className="lbl">Instrument</span>
              <select className="inp" value={symbol} onChange={(e)=>setSymbol(e.target.value)}>{symbols.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
            <label><span className="lbl">Size (contracts)</span>
              <input type="number" min={1} className="inp" value={size} onChange={(e)=>setSize(Math.max(1,+e.target.value))} /></label>
            <label><span className="lbl">Stop (points)</span>
              <input type="number" min={1} className="inp" value={stop} onChange={(e)=>setStop(Math.max(1,+e.target.value))} /></label>
            {profile.accounts.length>0 && (
              <label><span className="lbl">Account</span>
                <select className="inp" value={acctId} onChange={(e)=>setAcctId(e.target.value)}>
                  <option value="">— none —</option>
                  {profile.accounts.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
                </select></label>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[.78rem]">
            <button onClick={()=>setUseNow(true)} className={`chip ${useNow?"on":""}`} style={useNow?{color:"var(--acc)",borderColor:"color-mix(in srgb,var(--acc) 35%,transparent)"}:{}}>Right now</button>
            <button onClick={()=>setUseNow(false)} className={`chip ${!useNow?"on":""}`} style={!useNow?{color:"var(--acc)",borderColor:"color-mix(in srgb,var(--acc) 35%,transparent)"}:{}}>Pick a time</button>
            {useNow && <span className="text-t3">{DOW[now.getUTCDay()]} {String(now.getUTCHours()).padStart(2,"0")}:00 UTC</span>}
          </div>
          {!useNow && (
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <label><span className="lbl">Day</span>
                <select className="inp" value={dow} onChange={(e)=>setDow(+e.target.value)}>{DOW.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>
              <label><span className="lbl">Hour (UTC)</span>
                <select className="inp" value={hour} onChange={(e)=>setHour(+e.target.value)}>{Array.from({length:24},(_, i)=>i).map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}</select></label>
            </div>
          )}

          <div className="mt-4 lbl">Your day so far</div>
          <div className="grid sm:grid-cols-3 gap-3 mt-1">
            <label><span className="lbl">Trades today</span>
              <input type="number" min={0} className="inp" value={tradesToday} onChange={(e)=>setTradesToday(Math.max(0,+e.target.value))} /></label>
            <label><span className="lbl">P&L today ($)</span>
              <input type="number" className="inp" value={pnlToday} onChange={(e)=>setPnlToday(+e.target.value)} /></label>
            <label><span className="lbl">Losses in a row</span>
              <input type="number" min={0} className="inp" value={losses} onChange={(e)=>setLosses(Math.max(0,+e.target.value))} /></label>
          </div>
        </Panel>

        {/* Verdict */}
        <div className="card p-6" style={{ boxShadow: `0 0 0 1px ${meta.glow}, 0 18px 50px -20px ${meta.glow}` }}>
          <div className="flex items-center gap-4">
            <div className="grid place-items-center rounded-full shrink-0" style={{ width: 86, height: 86, background: meta.glow, color: meta.color }}>
              <Icon name={v.verdict==="GO"?"check":v.verdict==="SKIP"?"alert":"shield"} size={34} />
            </div>
            <div>
              <div className="mono font-bold leading-none" style={{ fontSize: "2rem", color: meta.color }}>{v.verdict}</div>
              <div className="text-[.82rem] text-t2 mt-1">{meta.label} · confidence {v.score}/100</div>
            </div>
          </div>
          <p className="text-[.95rem] text-t1 leading-relaxed mt-4">{v.summary}</p>
          {v.size.max>0 && v.size.proposed>v.size.max && (
            <div className="mt-3 chip" style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}>
              Size down: {v.size.proposed} → {v.size.suggested} max safe
            </div>
          )}

          <div className="mt-4 space-y-2">
            {v.reasons.map((r, i) => {
              const c = r.kind==="block"?"var(--red)":r.kind==="warn"?"var(--amb,#f5a623)":"var(--grn)";
              return (
                <div key={i} className="flex gap-2.5 items-start rounded-lg p-2.5" style={{ background: "rgba(127,127,127,0.09)" }}>
                  <span style={{ color: c }} className="mt-0.5 shrink-0"><Icon name={r.kind==="ok"?"check":"alert"} size={14} /></span>
                  <div>
                    <div className="text-[.84rem] font-semibold" style={{ color: c }}>{r.title}{r.cost?<span className="text-t3 font-normal"> · {usd(r.cost)} historically</span>:null}</div>
                    <div className="text-[.8rem] text-t2 leading-snug">{r.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AIRead module="Pre-Trade Gate" facts={facts} />
      <p className="text-[.7rem] text-t3">The gate reads your own history (instrument, day, hour, after-loss behavior) and your account's breach buffer. It never predicts the market — it stops you from taking the trades that have historically cost you. Times are UTC to match how your trades are bucketed.</p>
    </div>
  );
}
