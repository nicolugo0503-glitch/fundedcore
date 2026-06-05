"use client";
import { useEffect, useState } from "react";
import { type Profile } from "../../lib/profile";
import { assessAccount, STATUS_META } from "../../lib/risk";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { usd, pct, scoreColor } from "../../lib/format";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Brief({ profile, go }: { profile: Profile; go: (t: string) => void }) {
  const [news, setNews] = useState<any[] | null>(null);
  useEffect(() => {
    fetch("/api/news").then((r) => r.json()).then((d) => setNews(d.events || [])).catch(() => setNews([]));
  }, []);

  const now = new Date();
  const todayDow = now.getUTCDay();
  const risks = profile.accounts.map(assessAccount);
  const tightest = risks.length ? risks.reduce((a, b) => (b.distanceToBreach < a.distanceToBreach ? b : a)) : null;
  const ins = profile.trades.length >= 5 ? analyze(profile.trades) : null;
  const score = profile.trades.length >= 5 ? scoreTrades(profile.trades) : null;

  // today's events within the next ~24h
  const upcoming = (news || []).filter((e) => {
    const t = new Date(e.date).getTime();
    return t > now.getTime() - 3600000 && t < now.getTime() + 86400000;
  }).slice(0, 4);

  const dayBucket = ins?.byDay.find((b) => b.key === ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][todayDow]);
  const topLeak = ins?.leaks[0];

  // build the plan
  const plan: string[] = [];
  if (tightest) {
    plan.push(`Tightest account (${tightest.firm.firmBrand}) has ${usd(Math.max(0, tightest.distanceToBreach))} before breach — your hard ceiling on risk today.`);
  }
  if (upcoming.length) {
    const e = upcoming[0];
    const hhmm = new Date(e.date).toUTCString().slice(17, 22);
    plan.push(`${e.title} at ${hhmm} UTC — no trades in the 5 minutes around it.`);
  }
  if (dayBucket && dayBucket.trades >= 4) {
    plan.push(`Your ${DOW[todayDow]} win rate is ${pct(dayBucket.winRate)} historically${dayBucket.net < 0 ? " — trade smaller today" : " — a decent day for you"}.`);
  }
  if (topLeak) plan.push(`Watch your #1 leak: ${topLeak.title.toLowerCase()}. ${topLeak.fix}`);
  plan.push(`Cap: max ${profile.settings.maxTradesPerDay} trades, stop at ${usd(profile.settings.dailyLossStop)} down.`);

  return (
    <div className="space-y-5 fade">
      <div>
        <div className="eyebrow">{DOW[todayDow]} · pre-market brief</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Before you trade today, {profile.name}.</h1>
        <p className="text-t2 text-sm mt-1">Everything that matters, in one glance.</p>
      </div>

      {/* the plan */}
      <section className="card p-6" style={{ borderColor: "rgba(59,130,246,.35)" }}>
        <div className="eyebrow text-acc">Today's plan</div>
        <ul className="mt-3 space-y-2.5">
          {plan.map((p, i) => (
            <li key={i} className="flex gap-3 text-[.92rem] text-t1"><span className="text-acc mono">{i + 1}</span><span>{p}</span></li>
          ))}
        </ul>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        {/* risk */}
        <button onClick={() => go("risk")} className="card card-hover p-5 text-left">
          <div className="lbl">Tightest account</div>
          {tightest ? (
            <>
              <div className="text-2xl font-bold mono" style={{ color: STATUS_META[tightest.status].color }}>{usd(Math.max(0, tightest.distanceToBreach))}</div>
              <div className="text-[.78rem] text-t3">{tightest.firm.firmBrand} · {STATUS_META[tightest.status].label}</div>
            </>
          ) : <div className="text-t3 text-sm mt-1">Add an account →</div>}
        </button>

        {/* score */}
        <button onClick={() => go("journal")} className="card card-hover p-5 text-left">
          <div className="lbl">Trader Score</div>
          {score ? (
            <>
              <div className="text-2xl font-bold mono" style={{ color: scoreColor(score.traderScore) }}>{score.traderScore} <span className="text-base text-t2">{score.grade}</span></div>
              <div className="text-[.78rem] text-t3">confidence {pct(score.confidence)}</div>
            </>
          ) : <div className="text-t3 text-sm mt-1">Add trades →</div>}
        </button>

        {/* news */}
        <button onClick={() => go("news")} className="card card-hover p-5 text-left">
          <div className="lbl">Next high-impact news</div>
          {news === null ? <div className="text-t3 text-sm mt-1">Loading…</div> : upcoming.length ? (
            <>
              <div className="text-[.95rem] font-semibold truncate">{upcoming[0].title}</div>
              <div className="text-[.78rem] text-amb">{new Date(upcoming[0].date).toUTCString().slice(17, 22)} UTC</div>
            </>
          ) : <div className="text-grn text-sm mt-1">Clear for now</div>}
        </button>
      </div>

      {/* biggest leak + strength */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">Your biggest leak</h3><button className="text-acc text-xs" onClick={() => go("insights")}>all insights →</button></div>
          {topLeak ? (
            <>
              <div className="font-semibold text-red">{topLeak.title}</div>
              <p className="text-[.85rem] text-t2 mt-1">{topLeak.detail}</p>
              <p className="text-[.85rem] text-t1 mt-2">→ {topLeak.fix}</p>
            </>
          ) : <p className="text-t3 text-sm">Add ~20+ trades to surface your leaks.</p>}
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-2">What's working</h3>
          {ins && ins.strengths.length ? (
            <ul className="space-y-1.5">{ins.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-[.85rem] text-t2 flex gap-2"><span className="text-grn">▲</span>{s}</li>)}</ul>
          ) : <p className="text-t3 text-sm">Your strengths will appear here once you add trades.</p>}
        </div>
      </div>

      <button onClick={() => go("coach")} className="card card-hover p-5 w-full text-left flex items-center justify-between">
        <div><div className="font-semibold">Ask your AI coach</div><div className="text-[.85rem] text-t2">“What's my biggest flaw?” · “Will I blow this account?” · “What should I cut?”</div></div>
        <span className="text-acc">→</span>
      </button>
    </div>
  );
}
