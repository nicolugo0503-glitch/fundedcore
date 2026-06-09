"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { INSTRUMENTS } from "../../lib/firms";
import { portfolioRisk } from "../../lib/portfolio";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";
const INSTR = Object.keys(INSTRUMENTS);

export function PortfolioTab({ profile }: { profile: Profile }) {
  const [instrument, setInstrument] = useState(profile.settings.instrument);
  const [stop, setStop] = useState(profile.settings.defaultStop);
  const p = portfolioRisk(profile.accounts, profile.trades, instrument, stop);
  if (!p.ready) return <div className="fade"><SuiteHeader eyebrow="Multi-account" title="Breach optimizer" sub="Run more than one funded account? This sizes each to its own room and shows correlated wipeout risk." /><div className="card"><EmptyState icon="shield" title="Needs 2+ accounts" body="Add a second funded account in Settings. Copy-trading the same edge across accounts is correlation ≈ 1 — this engine shows how to size each so one bad day doesn't take them all." /></div></div>;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Multi-account" title="Breach optimizer" sub="Same edge across accounts moves together — size each to its own room, and know your correlated wipeout odds." right={
        <div className="flex gap-2">
          <select className="inp !py-1.5 text-sm" value={instrument} onChange={(e) => setInstrument(e.target.value)}>{INSTR.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <input type="number" className="inp !py-1.5 text-sm w-20" value={stop} onChange={(e) => setStop(Math.max(1, +e.target.value))} />
        </div>} />

      <div className="card p-5"><p className="text-[.92rem] text-t1 leading-relaxed">{p.summary}</p></div>

      <AIRead module="Multi-Account" facts={`${p.n} accounts, ${p.totalDeployable} ${instrument} deployable total, weakest account breaches at $${Math.round(p.weakestBuffer)}.${p.survival ? ` Correlated survival over 20 days: keep all ${Math.round(p.survival.keepAll*100)}%, lose all ${Math.round(p.survival.loseAll*100)}%.` : ""}`} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {p.accounts.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center justify-between mb-3"><div><div className="font-semibold">{a.label}</div><div className="text-[.74rem] text-t3">{a.firm}</div></div><span className="chip" style={{ borderColor: a.color + "66", color: a.color }}>● {Math.round(a.pctBuffer * 100)}%</span></div>
            <div className="flex items-center gap-4">
              <Ring pct={Math.max(.03, Math.min(1, a.pctBuffer))} color={a.color} size={66}><span className="mono text-[.7rem] font-bold" style={{ color: a.color }}>{a.maxContracts}</span></Ring>
              <div><div className="lbl mb-0.5">Max size here</div><div className="mono text-lg font-bold">{a.maxContracts} {instrument}</div><div className="text-[.7rem] text-t3">room {usd(a.dtb)} · safe/day {usd(a.safeDay)}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Correlated survival" icon={<Icon name="shield" />} action={<span className="text-[.66rem] text-t3 uppercase tracking-wide">500 sims · 20 days</span>}>
          {p.survival ? (
            <div className="space-y-3">
              {[["Keep all " + p.n, p.survival.keepAll, "var(--grn)"], ["Keep at least half", p.survival.keepHalf, "var(--amb)"], ["Lose every account", p.survival.loseAll, "var(--red)"]].map(([label, v, c], i) => (
                <div key={i}>
                  <div className="flex justify-between text-[.82rem] mb-1"><span className="text-t2">{label as string}</span><span className="mono font-semibold" style={{ color: c as string }}>{Math.round((v as number) * 100)}%</span></div>
                  <div className="h-2.5 rounded-full" style={{ background: "var(--panel2)" }}><div className="h-full rounded-full" style={{ width: ((v as number) * 100) + "%", background: c as string }} /></div>
                </div>
              ))}
              <p className="text-[.78rem] text-t3 leading-relaxed pt-1">Because the accounts share one trade, survival is nested — a drawdown deep enough to breach the weakest threatens all of them at once.</p>
            </div>
          ) : <div className="text-t3 text-sm py-4 text-center">Add trades to model correlated survival.</div>}
        </Panel>
        <Panel title="Total deployable" icon={<Icon name="calc" />}>
          <div className="flex items-center gap-4">
            <div className="mono text-[2.4rem] font-bold leading-none text-acc">{p.totalDeployable}</div>
            <div className="text-[.84rem] text-t2">{instrument} across all accounts, each sized to its own breach room.</div>
          </div>
          {p.uniformBreachCount > 0 && <div className="mt-4 rounded-lg px-3.5 py-2.5 text-[.82rem]" style={{ background: "rgba(220,38,38,.07)", border: "1px solid rgba(220,38,38,.2)", color: "var(--t1)" }}>⚠ If you instead copied your largest size onto every account, {p.uniformBreachCount} weaker account(s) would breach on a single max-loss day.</div>}
        </Panel>
      </div>
    </div>
  );
}
