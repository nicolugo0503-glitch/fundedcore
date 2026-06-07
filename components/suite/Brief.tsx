"use client";
import { useEffect, useState } from "react";
import { type Profile, demoProfile } from "../../lib/profile";
import { assessAccount, STATUS_META } from "../../lib/risk";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { usd, pct, scoreColor } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { Icon } from "../Icon";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Brief({ profile, go, setProfile }: { profile: Profile; go: (t: string) => void; setProfile?: (p: Profile) => void }) {
  const [news, setNews] = useState<any[] | null>(null);
  const [mkt, setMkt] = useState<{ key: string; label: string; last: number; chg: number }[] | null>(null);
  useEffect(() => { fetch("/api/news").then((r) => r.json()).then((d) => setNews(d.events || [])).catch(() => setNews([])); }, []);
  useEffect(() => {
    const wl = [["SPX", "S&P 500"], ["NDX", "Nasdaq"], ["GOLD", "Gold"], ["WTI", "Crude"], ["BTC", "Bitcoin"], ["US10Y", "10Y"]];
    Promise.all(wl.map(async ([k, label]) => {
      try { const d = await fetch(`/api/market?symbol=${k}&interval=1h&range=5d`).then((r) => r.json()); const cs = d.candles || []; if (cs.length) return { key: k, label, last: cs[cs.length - 1].c, chg: (cs[cs.length - 1].c - cs[0].o) / cs[0].o }; } catch {} return null;
    })).then((r) => setMkt(r.filter(Boolean) as any));
  }, []);

  const now = new Date();
  const todayDow = now.getUTCDay();
  const risks = profile.accounts.map(assessAccount);
  const tightest = risks.length ? risks.reduce((a, b) => (b.distanceToBreach < a.distanceToBreach ? b : a)) : null;
  const ins = profile.trades.length >= 5 ? analyze(profile.trades) : null;
  const score = profile.trades.length >= 5 ? scoreTrades(profile.trades) : null;

  const upcoming = (news || []).filter((e) => { const t = new Date(e.date).getTime(); return t > now.getTime() - 3600000 && t < now.getTime() + 86400000; }).slice(0, 4);
  const dayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][todayDow];
  const dayBucket = ins?.byDay.find((b) => b.key === dayKey);
  const topLeak = ins?.leaks[0];

  const spx = mkt?.find((m) => m.key === "SPX");
  const tone = spx ? (spx.chg < -0.007 ? "risk-off — index down hard overnight, trade lighter" : spx.chg > 0.007 ? "risk-on — index up overnight" : "flat tape overnight") : null;
  const plan: { n: number; text: string }[] = [];
  if (tightest) plan.push({ n: 1, text: `Tightest account (${tightest.firm.firmBrand}) has ${usd(Math.max(0, tightest.distanceToBreach))} before breach — your hard ceiling on risk today.` });
  if (spx && tone) plan.push({ n: plan.length + 1, text: `Tape check: S&P ${spx.chg >= 0 ? "+" : ""}${(spx.chg * 100).toFixed(1)}% over the last sessions — ${tone}.` });
  if (upcoming.length) { const e = upcoming[0]; plan.push({ n: plan.length + 1, text: `${e.title} at ${new Date(e.date).toUTCString().slice(17, 22)} UTC — no trades in the 5 minutes around it.` }); }
  if (dayBucket && dayBucket.trades >= 4) plan.push({ n: plan.length + 1, text: `Your ${DOW[todayDow]} win rate is ${pct(dayBucket.winRate)} historically${dayBucket.net < 0 ? " — trade smaller today" : " — a decent day for you"}.` });
  if (topLeak) plan.push({ n: plan.length + 1, text: `Watch your #1 leak: ${topLeak.title.toLowerCase()}. ${topLeak.fix}` });
  plan.push({ n: plan.length + 1, text: `Cap: max ${profile.settings.maxTradesPerDay} trades, stop at ${usd(profile.settings.dailyLossStop)} down.` });

  const tm = tightest ? STATUS_META[tightest.status] : null;
  const greeting = now.getUTCHours() < 11 ? "Good morning" : now.getUTCHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="fade space-y-4">
      <SuiteHeader eyebrow={`${DOW[todayDow]} · pre-market brief`}
        title={<>{greeting}, <span className="grad-text">{profile.name}</span>.</>}
        sub="Everything that matters before you take a trade, in one glance."
        right={<span className="chip"><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "var(--grn)" }} /> {risks.filter(r => r.status === "healthy").length}/{risks.length || 0} healthy</span>} />

      {/* MARKETS STRIP */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2 px-1"><span className="lbl mb-0">Markets right now</span>{mkt === null && <span className="text-[.7rem] text-t3">loading…</span>}</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-px rounded-lg overflow-hidden" style={{ background: "var(--line)" }}>
          {(mkt || []).map((m) => (
            <div key={m.key} className="px-3 py-2.5" style={{ background: "var(--panel)" }}>
              <div className="text-[.64rem] text-t3 uppercase tracking-wide truncate">{m.label}</div>
              <div className="mono text-[.92rem] font-semibold mt-0.5">{m.last >= 1000 ? m.last.toLocaleString("en-US", { maximumFractionDigits: 0 }) : m.last.toFixed(2)}</div>
              <div className="mono text-[.7rem] mt-0.5" style={{ color: m.chg >= 0 ? "var(--grn)" : "var(--red)" }}>{m.chg >= 0 ? "+" : ""}{(m.chg * 100).toFixed(2)}%</div>
            </div>
          ))}
          {mkt !== null && mkt.length === 0 && <div className="col-span-full text-center text-t3 text-sm py-3" style={{ background: "var(--panel)" }}>Market feed unavailable right now.</div>}
        </div>
      </div>

      {/* MAIN + RAIL */}
      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* main column */}
        <div className="lg:col-span-8 space-y-4">
          <Panel title="Today's plan" icon={<Icon name="target" />}>
            <ol className="space-y-3.5">
              {plan.map((p) => (
                <li key={p.n} className="flex gap-3.5 items-start">
                  <span className="ring-num shrink-0">{p.n}</span>
                  <span className="text-[.92rem] text-t1 leading-relaxed pt-0.5">{p.text}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Your biggest leak" icon={<Icon name="down" />} action={<button className="text-acc text-xs" onClick={() => go("insights")}>all insights →</button>}>
            {topLeak ? (
              <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                <div>
                  <div className="font-semibold text-red text-[.98rem]">{topLeak.title}</div>
                  <p className="text-[.85rem] text-t2 mt-1.5 leading-relaxed">{topLeak.detail}</p>
                  <div className="mt-3 rounded-lg px-3.5 py-2.5 text-[.85rem] text-t1" style={{ background: "rgba(248,81,73,.07)", border: "1px solid rgba(248,81,73,.22)" }}>→ {topLeak.fix}</div>
                </div>
                <div className="rounded-lg px-4 py-3 text-center shrink-0" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
                  <div className="lbl mb-0">cost</div><div className="mono text-xl font-bold text-red">{usd(-topLeak.cost)}</div>
                </div>
              </div>
            ) : <EmptyState icon="spark" title="No leaks yet" body="Add ~20+ trades and we'll rank the patterns costing you the most money — in dollars." cta={<div className="flex gap-2"><button onClick={() => go("journal")} className="btn btn-ghost text-sm">Add my trades</button>{setProfile && <button onClick={() => setProfile(demoProfile(profile))} className="btn btn-primary text-sm">Load demo data</button>}</div>} />}
          </Panel>

          <Panel title="What's working" icon={<Icon name="up" />}>
            {ins && ins.strengths.length ? (
              <ul className="space-y-2.5">{ins.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-[.86rem] text-t2 flex gap-2.5 leading-relaxed"><span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "var(--grn)" }} />{s}</li>)}</ul>
            ) : <EmptyState icon="gauge" title="Your edge, surfaced" body="Once you add trades, your best hours, days, and setups show up here so you can lean into them." />}
          </Panel>
        </div>

        {/* rail */}
        <aside className="lg:col-span-4 space-y-4">
          <button onClick={() => go("risk")} className="card card-hover p-5 w-full flex items-center gap-4 text-left">
            {tightest ? (
              <>
                <Ring pct={Math.max(.04, Math.min(1, tightest.pctBuffer))} color={tm!.color} size={72}>
                  <span className="mono text-[.85rem] font-bold" style={{ color: tm!.color }}>{Math.round(tightest.pctBuffer * 100)}%</span>
                </Ring>
                <div><div className="lbl mb-0.5">Distance to breach</div><div className="mono text-xl font-bold" style={{ color: tm!.color }}>{usd(Math.max(0, tightest.distanceToBreach))}</div><div className="text-[.7rem] text-t3 mt-0.5">{tightest.firm.firmBrand}</div></div>
              </>
            ) : <div className="text-t3 text-sm py-3">No accounts — <span className="text-acc">add one →</span></div>}
          </button>

          <button onClick={() => go("journal")} className="card card-hover p-5 w-full flex items-center gap-4 text-left">
            {score ? (
              <>
                <Ring pct={score.traderScore / 100} color={scoreColor(score.traderScore)} size={72}>
                  <span className="mono text-base font-bold" style={{ color: scoreColor(score.traderScore) }}>{score.traderScore}</span>
                </Ring>
                <div><div className="lbl mb-0.5">Trader Score · {score.grade}</div><div className="text-[.9rem] text-t1 font-medium">{score.decision === "FUNDED" ? "Fundable edge" : score.decision === "CONDITIONAL" ? "Borderline edge" : "Unproven edge"}</div><div className="text-[.7rem] text-t3 mt-0.5">confidence {pct(score.confidence)}</div></div>
              </>
            ) : <><Ring pct={0} color="var(--acc)" size={72}><span className="text-t3">?</span></Ring><div><div className="lbl mb-0.5">Trader Score</div><div className="text-[.82rem] text-t2">Add trades →</div></div></>}
          </button>

          <button onClick={() => go("news")} className="card card-hover p-5 w-full text-left">
            <div className="flex items-center gap-2.5 mb-2"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}><Icon name="news" size={14} /></span><span className="lbl mb-0">Next high-impact news</span></div>
            {news === null ? <div className="text-t3 text-sm">Loading…</div> : upcoming.length ? (
              <><div className="text-[.98rem] font-semibold truncate">{upcoming[0].title}</div><div className="mono text-[.78rem] mt-0.5" style={{ color: "var(--amb)" }}>{new Date(upcoming[0].date).toUTCString().slice(17, 22)} UTC · in {Math.max(0, Math.round((+new Date(upcoming[0].date) - now.getTime()) / 60000))}m</div></>
            ) : <div className="text-[.98rem] font-semibold" style={{ color: "var(--grn)" }}>Clear for now</div>}
          </button>

          <button onClick={() => go("coach")} className="card card-hover p-5 w-full text-left">
            <div className="flex items-center gap-3 mb-1.5"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--acc-weak)", border: "1px solid var(--line2)", color: "var(--acc)" }}><Icon name="brain" size={16} /></span><div className="font-semibold text-[.95rem]">Ask your AI coach</div></div>
            <div className="text-[.82rem] text-t2 leading-relaxed">“What's my biggest flaw?” · “Will I blow this account?” · “What should I cut?”</div>
          </button>
        </aside>
      </div>
    </div>
  );
}
