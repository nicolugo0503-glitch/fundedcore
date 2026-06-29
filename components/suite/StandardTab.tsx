"use client";
import { useEffect, useState } from "react";
import { type Profile } from "../../lib/profile";
import { benchmark, type Cohort, type Benchmark } from "../../lib/benchmark";
import { submission } from "../../lib/benchmark";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { Icon } from "../Icon";

const ACC = "var(--acc)", GRN = "var(--grn)", RED = "var(--red)", T3 = "var(--t3)";

export function StandardTab({ profile }: { profile: Profile }) {
  const [cohort, setCohort] = useState<Cohort>(null);
  const acct = profile.accounts[0] || null;
  const ready = profile.trades.length >= 5;

  useEffect(() => {
    let alive = true;
    fetch("/api/benchmark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cohort" }) })
      .then((r) => r.json()).then((j) => { if (alive) setCohort({ count: j.count || 0, anchors: j.anchors || {} }); }).catch(() => {});
    // contribute to the moat — only real (non-demo) accounts, once per day
    try {
      if (ready && !profile.demo) {
        const k = "fc-bench-submit", today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(k) !== today) {
          fetch("/api/benchmark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit", metrics: submission(profile.trades, acct) }) })
            .then(() => localStorage.setItem(k, today)).catch(() => {});
        }
      }
    } catch {}
    return () => { alive = false; };
  }, [ready, profile.demo]);

  if (!ready) return <div className="fade"><SuiteHeader eyebrow="The Standard" title="Where you rank among funded traders" /><EmptyState icon="up" title="Need a few more trades" body="Sync your account or upload your trades — The Standard ranks your behavior against the whole FundedCore cohort." /></div>;

  const b: Benchmark = benchmark(profile.trades, acct, cohort);
  const compColor = b.composite >= 60 ? GRN : b.composite >= 40 ? "var(--amb)" : RED;
  const backing = b.cohortCount >= 30 ? `Backed by ${b.cohortCount.toLocaleString()} synced accounts` : `Baseline cohort · grows with every account (${b.cohortCount} live so far)`;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="The Standard" title="Where you rank among funded traders" sub="Your behavior, scored against the entire FundedCore cohort. This is the benchmark prop firms can't build — and it sharpens with every trader who joins." />

      {profile.demo && <div className="card p-3 text-[.84rem]" style={{ color: "var(--amb)" }}>Demo data — sync your account to get your real rank (and add to the cohort).</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Your FundedCore Rank" icon={<Icon name="gauge" />}>
          <div className="flex items-center gap-5">
            <Ring pct={b.composite} color={compColor} size={120} stroke={11}>
              <div className="text-center"><div className="mono text-3xl font-bold" style={{ color: compColor }}>{b.grade}</div></div>
            </Ring>
            <div>
              <div className="mono text-3xl font-bold" style={{ color: compColor }}>{b.rankLabel}</div>
              <div className="text-[.86rem] text-t2 mt-1">of funded futures traders, by behavior.</div>
              <div className="text-[.74rem] mt-2 inline-flex items-center gap-1.5" style={{ color: T3 }}><Icon name="grid" size={12} /> {backing}</div>
            </div>
          </div>
        </Panel>
        <Panel title="How the rank is built" icon={<Icon name="spark" />} className="lg:col-span-2">
          <div className="text-[.88rem] text-t2 leading-relaxed">
            Five behavioral signals — composure, profit factor, payoff, win rate and breach risk — each scored as a percentile against the cohort, then weighted into one rank. It reads <b className="text-t1">how you trade</b>, not how the market moved. The more accounts that sync, the more this becomes the real, defensible standard for funded-trader discipline.
          </div>
        </Panel>
      </div>

      <Panel title="You vs the cohort" icon={<Icon name="up" />}>
        <div className="space-y-3.5">
          {b.metrics.map((m) => {
            const c = m.percentile >= 60 ? GRN : m.percentile >= 40 ? "var(--amb)" : RED;
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between text-[.84rem] mb-1">
                  <span className="text-t1 font-medium">{m.label}</span>
                  <span className="text-t3">you <b className="text-t1 mono">{m.fmt(m.value)}</b> · median <span className="mono">{m.fmt(m.median)}</span> · top 10% <span className="mono">{m.fmt(m.top10)}</span></span>
                </div>
                <div className="h-2.5 rounded-full relative" style={{ background: "rgba(127,127,127,0.12)" }}>
                  <div className="h-full rounded-full" style={{ width: m.percentile + "%", background: c, transition: "width .5s" }} />
                  <div className="absolute top-1/2 -translate-y-1/2" style={{ left: "50%", width: 2, height: 14, background: T3, opacity: .5 }} title="median" />
                </div>
                <div className="text-[.72rem] text-t3 mt-0.5">{m.percentile >= 50 ? `Top ${100 - m.percentile}%` : `Bottom ${m.percentile}%`} on this signal</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <p className="text-[.72rem] text-t3">Your data is contributed anonymously (numbers only — no account names, no positions, no PII) to build the cohort. The benchmark is a baseline until enough accounts join, then it becomes the live standard.</p>
    </div>
  );
}
