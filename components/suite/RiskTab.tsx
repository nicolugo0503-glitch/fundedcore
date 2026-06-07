"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { FIRMS, INSTRUMENTS } from "../../lib/firms";
import { assessAccount, guardrail, maxSizeNow, STATUS_META, type Account } from "../../lib/risk";
import { usd } from "../../lib/format";
import { SuiteHeader } from "./ui";

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

  if (!profile.accounts.length) return <Empty msg="Add an account in Settings to use the Risk tab." />;

  const res = account ? guardrail(account, { instrument, size, stop }) : null;
  const maxNow = account ? maxSizeNow(account, instrument, stop) : 0;
  const vcolor: Record<string, string> = { APPROVE: "#10B981", REDUCE: "#F59E0B", WAIT: "#F59E0B", BLOCK: "#EF4444" };

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Risk" title="Distance to breach + pre-trade guardrail" sub="Live breach distance across every account, and the largest size you can take right now." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profile.accounts.map((a) => {
          const r = assessAccount(a); const sm = STATUS_META[r.status];
          return (
            <div key={a.id} className={`card p-5 ${a.id === sel ? "ring-1 ring-acc/60" : ""}`} onClick={() => setSel(a.id)}>
              <div className="flex justify-between items-start">
                <div><div className="font-semibold">{a.label}</div><div className="text-[.76rem] text-t3">{r.firm.name}</div></div>
                <span className="chip" style={{ borderColor: sm.color + "66", color: sm.color }}>● {sm.label}</span>
              </div>
              <div className="text-[.7rem] uppercase text-t3 mt-3">Distance to breach</div>
              <div className="text-2xl font-bold mono" style={{ color: sm.color }}>{usd(Math.max(0, r.distanceToBreach))}</div>
              <div className="h-2 rounded-full bg-black/[.06] overflow-hidden mt-2"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, r.pctBuffer)) * 100}%`, background: sm.color }} /></div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block"><span className="lbl">Balance</span><input type="number" className="inp !py-1 text-sm" value={a.balance} onClick={(e) => e.stopPropagation()} onChange={(e) => update(a.id, { balance: +e.target.value })} /></label>
                <label className="block"><span className="lbl">Today P&L</span><input type="number" className="inp !py-1 text-sm" value={a.todayPnL} onClick={(e) => e.stopPropagation()} onChange={(e) => update(a.id, { todayPnL: +e.target.value })} /></label>
              </div>
            </div>
          );
        })}
      </div>

      {account && res && (
        <section className="card p-6">
          <div className="eyebrow">Pre-trade guardrail</div>
          <h2 className="text-lg font-bold mt-1 mb-4">Can I take this trade?</h2>
          <div className="grid sm:grid-cols-4 gap-3 mb-4">
            <label><span className="lbl">Account</span><select className="inp" value={account.id} onChange={(e) => setSel(e.target.value)}>{profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
            <label><span className="lbl">Instrument</span><select className="inp" value={instrument} onChange={(e) => setInstrument(e.target.value)}>{INSTR.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
            <label><span className="lbl">Stop ({INSTRUMENTS[instrument]?.stopUnit})</span><input type="number" className="inp" value={stop} onChange={(e) => setStop(Math.max(1, +e.target.value))} /></label>
            <label><span className="lbl">Size</span><input type="number" className="inp" value={size} onChange={(e) => setSize(Math.max(1, +e.target.value))} /></label>
          </div>
          <div className="rounded-xl p-5" style={{ background: vcolor[res.verdict] + "12", border: `1px solid ${vcolor[res.verdict]}44` }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold" style={{ color: vcolor[res.verdict] }}>{res.verdict}</span>
              <span className="chip" style={{ borderColor: vcolor[res.verdict] + "55", color: vcolor[res.verdict] }}>max safe size: {res.safeSize}</span>
              <span className="chip">worst case {usd(res.worstCase)}</span>
              <span className="chip">max {instrument} now: {maxNow}</span>
            </div>
            <p className="text-sm text-t2 mt-3" dangerouslySetInnerHTML={{ __html: res.reason }} />
          </div>
        </section>
      )}
      <p className="text-[.7rem] text-t3">Rule snapshots are illustrative — confirm with your firm.</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="card p-8 text-center text-t3">{msg}</div>;
}
