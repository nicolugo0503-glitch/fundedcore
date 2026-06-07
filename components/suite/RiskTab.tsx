"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { INSTRUMENTS } from "../../lib/firms";
import { assessAccount, guardrail, maxSizeNow, worstCaseLoss, STATUS_META, type Account } from "../../lib/risk";
import { monteCarlo } from "../../lib/montecarlo";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, Ring } from "./ui";
import { Icon } from "./../Icon";

const INSTR = Object.keys(INSTRUMENTS);

export function RiskTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [sel, setSel] = useState(profile.accounts[0]?.id || "");
  const [instrument, setInstrument] = useState(profile.settings.instrument);
  const [stop, setStop] = useState(profile.settings.defaultStop);
  const [size, setSize] = useState(2);

  function update(id: string, patch: Partial<Account>) {
    setProfile({ ...profile, accounts: profile.accounts.map((a) => a.id === id ? { ...a, ...patch, peakEquity: Math.max(a.peakEquity, patch.balance ?? a.balance) } : a) });
  }

  const account = profile.accounts.find((a) => a.id === sel) || profile.accounts[0];
  if (!profile.accounts.length) return <div className="card p-8 text-center text-t3">Add an account in Settings to use the Risk tab.</div>;

  const r = account ? assessAccount(account) : null;
  const res = account ? guardrail(account, { instrument, size, stop }) : null;
  const maxNow = account ? maxSizeNow(account, instrument, stop) : 0;
  const vcolor: Record<string, string> = { APPROVE: "#10B981", REDUCE: "#F59E0B", WAIT: "#F59E0B", BLOCK: "#EF4444" };

  // ── Scenario engine ──
  const perPt = INSTRUMENTS[instrument]?.perPoint || 1;
  const wc = worstCaseLoss(instrument, size, stop);
  const losersToBreach = r && wc > 0 ? Math.floor(Math.max(0, r.distanceToBreach) / wc) : 0;
  const ptsToBreach = r && perPt * size > 0 ? Math.max(0, r.distanceToBreach) / (perPt * size) : 0;

  // ── Monte Carlo survival (resample the trader's own P&L vs this account's trailing DD) ──
  const mc = account && profile.trades.length >= 3 ? monteCarlo(profile.trades, r!.firm.trailingDD, 500, 80) : null;
  const breachOdds = mc && mc.blow > 0 ? Math.round(1 / mc.blow) : null;
  const survColor = mc ? (mc.survive > 0.85 ? "#10B981" : mc.survive > 0.65 ? "#F59E0B" : "#EF4444") : "#94A3B8";

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Risk engine" title="Distance to breach, survival odds & guardrail" sub="Live breach distance, a Monte-Carlo read on whether your edge survives this account, and the largest size you can take right now." />

      {/* ACCOUNT GAUGES */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profile.accounts.map((a) => {
          const ar = assessAccount(a); const sm = STATUS_META[ar.status];
          return (
            <button key={a.id} onClick={() => setSel(a.id)} className={`card card-hover p-5 text-left ${a.id === sel ? "ring-1 ring-acc/60" : ""}`}>
              <div className="flex justify-between items-start mb-3">
                <div><div className="font-semibold">{a.label}</div><div className="text-[.74rem] text-t3">{ar.firm.firmBrand}</div></div>
                <span className="chip" style={{ borderColor: sm.color + "66", color: sm.color }}>● {sm.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <Ring pct={Math.max(0.03, Math.min(1, ar.pctBuffer))} color={sm.color} size={76}>
                  <span className="mono text-[.8rem] font-bold" style={{ color: sm.color }}>{Math.round(ar.pctBuffer * 100)}%</span>
                </Ring>
                <div>
                  <div className="lbl mb-0.5">Distance to breach</div>
                  <div className="mono text-xl font-bold" style={{ color: sm.color }}>{usd(Math.max(0, ar.distanceToBreach))}</div>
                  <div className="text-[.7rem] text-t3 mt-0.5">via {ar.bindingConstraint} limit</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {account && r && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* SURVIVAL — Monte Carlo */}
          <Panel title="Survival odds" icon={<Icon name="shield" />} action={<span className="text-[.66rem] text-t3 uppercase tracking-wide">Monte Carlo · 500 sims</span>}>
            {mc ? (
              <div className="flex items-center gap-5">
                <Ring pct={mc.survive} color={survColor} size={104} stroke={9}>
                  <div className="text-center"><div className="mono text-[1.5rem] font-bold leading-none" style={{ color: survColor }}>{Math.round(mc.survive * 100)}%</div><div className="text-[.6rem] text-t3 mt-0.5">survive</div></div>
                </Ring>
                <div className="text-[.86rem] text-t2 leading-relaxed">
                  Resampling your <b className="text-t1">{profile.trades.length}</b> trades across the next <b className="text-t1">80</b> on this account:
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="chip" style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}>breach {Math.round(mc.blow * 100)}%{breachOdds ? ` · ~1 in ${breachOdds}` : ""}</span>
                    <span className="chip" style={{ color: "var(--grn)", borderColor: "color-mix(in srgb, var(--grn) 30%, transparent)" }}>finish green {Math.round(mc.pass * 100)}%</span>
                    <span className="chip">median P&amp;L {usd(mc.p50[mc.p50.length - 1])}</span>
                  </div>
                  <p className="mt-2.5 text-[.82rem]" style={{ color: survColor }}>{mc.survive > 0.85 ? "Your edge comfortably survives this account's drawdown." : mc.survive > 0.65 ? "Survivable, but the drawdown limit is a real threat — size matters." : "Your current distribution breaches this account too often. Cut size or improve consistency first."}</p>
                </div>
              </div>
            ) : <div className="text-t3 text-sm py-6 text-center">Add ~20+ trades to model survival odds for this account.</div>}
          </Panel>

          {/* SCENARIO ENGINE */}
          <Panel title="What breaches you" icon={<Icon name="alert" />}>
            <div className="space-y-3">
              <Scenario label={`Straight losers at ${size} ${instrument}`} value={`${losersToBreach}`} sub={`${stop}-${INSTRUMENTS[instrument]?.stopUnit || "pt"} stops · ${usd(wc)} each`} color={losersToBreach <= 2 ? "var(--red)" : losersToBreach <= 4 ? "var(--amb)" : "var(--grn)"} />
              <Scenario label="Adverse move to breach" value={`${Math.round(ptsToBreach)} pts`} sub={`at ${size} ${instrument} · ${usd(perPt * size)}/pt`} color="var(--t1)" />
              <Scenario label="Max contracts you can take now" value={`${maxNow}`} sub={`${instrument} @ ${stop}-pt stop, capped by firm`} color="var(--acc)" />
              <div className="text-[.78rem] text-t2 leading-relaxed pt-1">At today's size, <b className="text-t1">{losersToBreach}</b> consecutive max-loss trades ends <b className="text-t1">{account.label}</b>. That's your hard line — never let a session run past it.</div>
            </div>
          </Panel>
        </div>
      )}

      {/* GUARDRAIL */}
      {account && res && (
        <Panel title="Pre-trade guardrail" icon={<Icon name="check" />} action={<span className="text-[.66rem] text-t3 uppercase tracking-wide">recomputes live</span>}>
          <div className="grid sm:grid-cols-5 gap-3 mb-4">
            <label><span className="lbl">Account</span><select className="inp" value={account.id} onChange={(e) => setSel(e.target.value)}>{profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
            <label><span className="lbl">Instrument</span><select className="inp" value={instrument} onChange={(e) => setInstrument(e.target.value)}>{INSTR.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
            <label><span className="lbl">Stop ({INSTRUMENTS[instrument]?.stopUnit})</span><input type="number" className="inp" value={stop} onChange={(e) => setStop(Math.max(1, +e.target.value))} /></label>
            <label><span className="lbl">Size</span><input type="number" className="inp" value={size} onChange={(e) => setSize(Math.max(1, +e.target.value))} /></label>
            <div className="flex items-end"><button onClick={() => setSize(maxNow)} className="btn btn-ghost w-full text-[.8rem]">Set max ({maxNow})</button></div>
          </div>
          <div className="rounded-xl p-5" style={{ background: vcolor[res.verdict] + "12", border: `1px solid ${vcolor[res.verdict]}44` }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold" style={{ color: vcolor[res.verdict] }}>{res.verdict}</span>
              <span className="chip" style={{ borderColor: vcolor[res.verdict] + "55", color: vcolor[res.verdict] }}>max safe size: {res.safeSize}</span>
              <span className="chip">worst case {usd(res.worstCase)}</span>
            </div>
            <p className="text-sm text-t2 mt-3" dangerouslySetInnerHTML={{ __html: res.reason }} />
          </div>
        </Panel>
      )}

      {/* account inputs */}
      {account && (
        <Panel title="Account state" icon={<Icon name="settings" />}>
          <div className="grid sm:grid-cols-3 gap-3">
            {profile.accounts.map((a) => (
              <div key={a.id} className="rounded-lg p-3" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
                <div className="text-[.8rem] font-medium mb-2">{a.label}</div>
                <label className="block mb-2"><span className="lbl">Balance</span><input type="number" className="inp !py-1 text-sm" value={a.balance} onChange={(e) => update(a.id, { balance: +e.target.value })} /></label>
                <label className="block"><span className="lbl">Today P&amp;L</span><input type="number" className="inp !py-1 text-sm" value={a.todayPnL} onChange={(e) => update(a.id, { todayPnL: +e.target.value })} /></label>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <p className="text-[.7rem] text-t3">Rule snapshots are illustrative — confirm with your firm.</p>
    </div>
  );
}

function Scenario({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
      <div><div className="text-[.84rem] text-t1">{label}</div><div className="text-[.7rem] text-t3 mt-0.5">{sub}</div></div>
      <div className="mono text-xl font-bold shrink-0 ml-3" style={{ color }}>{value}</div>
    </div>
  );
}
