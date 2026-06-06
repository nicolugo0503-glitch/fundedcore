"use client";
import { useEffect, useState } from "react";
import { type Profile } from "../../lib/profile";
import { assessAccount, STATUS_META } from "../../lib/risk";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { usd, pct, scoreColor } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Brief({ profile, go }: { profile: Profile; go: (t: string) => void }) {
  const [news, setNews] = useState<any[] | null>(null);
  useEffect(() => { fetch("/api/news").then((r) => r.json()).then((d) => setNews(d.events || [])).catch(() => setNews([])); }, []);

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

  const plan: { n: number; text: string }[] = [];
  if (tightest) plan.push({ n: 1, text: `Tightest account (${tightest.firm.firmBrand}) has ${usd(Math.max(0, tightest.distanceToBreach))} before breach — your hard ceiling on risk today.` });
  if (upcoming.length) { const e = upcoming[0]; plan.push({ n: plan.length + 1, text: `${e.title} at ${new Date(e.date).toUTCString().slice(17, 22)} UTC — no trades in the 5 minutes around it.` }); }
  if (dayBucket && dayBucket.trades >= 4) plan.push({ n: plan.length + 1, text: `Your ${DOW[todayDow]} win rate is ${pct(dayBucket.winRate)} historically${dayBucket.net < 0 ? " — trade smaller today" : " — a decent day for you"}.` });
  if (topLeak) plan.push({ n: plan.length + 1, text: `Watch your #1 leak: ${topLeak.title.toLowerCase()}. ${topLeak.fix}` });
  plan.push({ n: plan.length + 1, text: `Cap: max ${profile.settings.maxTradesPerDay} trades, stop at ${usd(profile.settings.dailyLossStop)} down.` });

  const tm = tightest ? STATUS_META[tightest.status] : null;
  const greeting = now.getUTCHours() < 11 ? "Good morning" : now.getUTCHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow={`${DOW[todayDow]} · pre-market brief`}
        title={<>{greeting}, <span className="grad-text">{profile.name}</span>.</>}
        sub="Everything that matters before you take a trade, in one glance."
        right={<span className="chip" style={{ borderColor: "#34D39955", color: "#34D399" }}><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "#34D399" }} /> {risks.filter(r => r.status === "healthy").length}/{risks.length || 0} healthy</span>} />

      {/* HERO STAT ROW */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* tightest account ring */}
        <button onClick={() => go("risk")} className="card card-hover p-5 flex items-center gap-4 text-left relative overflow-hidden">
          <div className="absolute top-0 left-5 right-5 h-px" style={{ background: `linear-gradient(90deg, ${tm?.color || "#5B8CFF"}, transparent)` }} />
          {tightest ? (
            <>
              <Ring pct={Math.max(.04, Math.min(1, tightest.pctBuffer))} color={tm!.color} size={86}>
                <span className="mono text-[.95rem] font-bold" style={{ color: tm!.color }}>{Math.round(tightest.pctBuffer * 100)}%</span>
                <span className="text-[.55rem] text-t3 uppercase">buffer</span>
              </Ring>
              <div>
                <div className="lbl mb-0.5">Distance to breach</div>
                <div className="mono text-2xl font-bold" style={{ color: tm!.color }}>{usd(Math.max(0, tightest.distanceToBreach))}</div>
                <div className="text-[.72rem] text-t3 mt-0.5">{tightest.firm.firmBrand} · {tm!.label}</div>
              </div>
            </>
          ) : <div className="text-t3 text-sm py-4">No accounts yet — <span className="text-acc">add one →</span></div>}
        </button>

        {/* score ring */}
        <button onClick={() => go("journal")} className="card card-hover p-5 flex items-center gap-4 text-left relative overflow-hidden">
          <div className="absolute top-0 left-5 right-5 h-px" style={{ background: "linear-gradient(90deg,#8B5CF6,transparent)" }} />
          {score ? (
            <>
              <Ring pct={score.traderScore / 100} color={scoreColor(score.traderScore)} size={86}>
                <span className="mono text-lg font-bold" style={{ color: scoreColor(score.traderScore) }}>{score.traderScore}</span>
                <span className="text-[.55rem] text-t3 uppercase">{score.grade}</span>
              </Ring>
              <div>
                <div className="lbl mb-0.5">Trader Score</div>
                <div className="text-[.9rem] text-t1 font-medium">{score.decision === "FUNDED" ? "Fundable edge" : score.decision === "CONDITIONAL" ? "Borderline edge" : "Unproven edge"}</div>
                <div className="text-[.72rem] text-t3 mt-0.5">confidence {pct(score.confidence)}</div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Ring pct={0} color="#8B5CF6" size={86}><span className="text-t3 text-lg">?</span></Ring>
              <div><div className="lbl mb-0.5">Trader Score</div><div className="text-[.82rem] text-t2">Add trades to unlock <span className="text-acc">→</span></div></div>
            </div>
          )}
        </button>

        {/* news */}
        <button onClick={() => go("news")} className="card card-hover p-5 text-left relative overflow-hidden">
          <div className="absolute top-0 left-5 right-5 h-px" style={{ background: "linear-gradient(90deg,#FBBF24,transparent)" }} />
          <div className="flex items-center gap-2.5 mb-3"><span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(251,191,36,.16)", color: "#FBBF24", border: "1px solid #FBBF2440" }}>◷</span><span className="lbl mb-0">Next high-impact news</span></div>
          {news === null ? <div className="text-t3 text-sm">Loading…</div> : upcoming.length ? (
            <><div className="text-[1.05rem] font-semibold truncate">{upcoming[0].title}</div><div className="mono text-[.8rem] text-amb mt-0.5">{new Date(upcoming[0].date).toUTCString().slice(17, 22)} UTC · in {Math.max(0, Math.round((+new Date(upcoming[0].date) - now.getTime()) / 60000))}m</div></>
          ) : <div className="text-grn text-[1.05rem] font-semibold">Clear for now ✓</div>}
        </button>
      </div>

      {/* TODAY'S PLAN */}
      <Panel title="Today's plan" icon="◆" accent="#5B8CFF">
        <ol className="space-y-3">
          {plan.map((p) => (
            <li key={p.n} className="flex gap-3.5 items-start">
              <span className="ring-num shrink-0" style={{ width: 30, height: 30, fontSize: ".72rem", borderRadius: 9 }}>{p.n}</span>
              <span className="text-[.92rem] text-t1 leading-relaxed pt-1">{p.text}</span>
            </li>
          ))}
        </ol>
      </Panel>

      {/* LEAK + STRENGTH */}
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Your biggest leak" icon="▼" accent="#F87171" action={<button className="text-acc text-xs" onClick={() => go("insights")}>all insights →</button>}>
          {topLeak ? (
            <div>
              <div className="font-semibold text-red text-[.98rem]">{topLeak.title}</div>
              <p className="text-[.85rem] text-t2 mt-1.5 leading-relaxed">{topLeak.detail}</p>
              <div className="mt-3 rounded-xl px-3.5 py-2.5 text-[.85rem] text-t1" style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)" }}>→ {topLeak.fix}</div>
            </div>
          ) : <EmptyState icon="✦" title="No leaks yet" body="Add ~20+ trades and we'll rank the patterns costing you the most money — in dollars." cta={<button onClick={() => go("journal")} className="btn btn-ghost text-sm">Add trades</button>} />}
        </Panel>
        <Panel title="What's working" icon="▲" accent="#34D399">
          {ins && ins.strengths.length ? (
            <ul className="space-y-2.5">{ins.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-[.86rem] text-t2 flex gap-2.5 leading-relaxed"><span className="text-grn mt-0.5 shrink-0">▲</span>{s}</li>)}</ul>
          ) : <EmptyState icon="◎" title="Your edge, surfaced" body="Once you add trades, your best hours, days, and setups show up here so you can lean into them." />}
        </Panel>
      </div>

      {/* COACH CTA */}
      <button onClick={() => go("coach")} className="card card-hover p-5 w-full text-left flex items-center justify-between group relative overflow-hidden">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: "linear-gradient(90deg, rgba(91,140,255,.06), transparent)" }} />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg,#5B8CFF,#8B5CF6)", boxShadow: "0 0 24px -6px rgba(91,140,255,.7)" }}>✦</span>
          <div><div className="font-semibold">Ask your AI coach</div><div className="text-[.84rem] text-t2">“What's my biggest flaw?” · “Will I blow this account?” · “What should I cut?”</div></div>
        </div>
        <span className="relative text-acc text-lg transition-transform group-hover:translate-x-1.5">→</span>
      </button>
    </div>
  );
}
