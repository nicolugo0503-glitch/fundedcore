"use client";
import { useState } from "react";
import { type Profile, clearProfile, DEFAULT_PROFILE, demoProfile } from "../../lib/profile";
import { FIRMS, INSTRUMENTS } from "../../lib/firms";
import { type Account } from "../../lib/risk";
import { usd } from "../../lib/format";
import { SuiteHeader } from "./ui";

const INSTR = Object.keys(INSTRUMENTS);
let _id = 1; const nid = () => "acc" + _id++ + Date.now().toString(36);

export function SettingsTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const firmKeys = Object.keys(FIRMS);
  const [firmKey, setFirmKey] = useState(firmKeys[0]);
  const [bal, setBal] = useState(FIRMS[firmKeys[0]].start);

  function set<K extends keyof Profile["settings"]>(k: K, v: Profile["settings"][K]) {
    setProfile({ ...profile, settings: { ...profile.settings, [k]: v } });
  }
  function addAccount() {
    const firm = FIRMS[firmKey];
    const a: Account = { id: nid(), label: firm.firmBrand + " #" + (profile.accounts.length + 1), firmKey, startBalance: firm.start, balance: bal, peakEquity: Math.max(bal, firm.start), todayPnL: 0, daysTraded: 0 };
    setProfile({ ...profile, accounts: [...profile.accounts, a] });
  }
  function removeAccount(id: string) { setProfile({ ...profile, accounts: profile.accounts.filter((a) => a.id !== id) }); }

  return (
    <div className="space-y-5 fade max-w-2xl">
      <SuiteHeader eyebrow="Settings" title="Personalize your suite" />

      <section className="card p-5 space-y-3">
        <h3 className="font-semibold">You</h3>
        <label className="block"><span className="lbl">Name</span><input className="inp" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="lbl">Default instrument</span><select className="inp" value={profile.settings.instrument} onChange={(e) => set("instrument", e.target.value)}>{INSTR.map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="block"><span className="lbl">Default stop</span><input type="number" className="inp" value={profile.settings.defaultStop} onChange={(e) => set("defaultStop", +e.target.value)} /></label>
          <label className="block"><span className="lbl">Max trades / day</span><input type="number" className="inp" value={profile.settings.maxTradesPerDay} onChange={(e) => set("maxTradesPerDay", +e.target.value)} /></label>
          <label className="block"><span className="lbl">Daily loss stop ($)</span><input type="number" className="inp" value={profile.settings.dailyLossStop} onChange={(e) => set("dailyLossStop", +e.target.value)} /></label>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="font-semibold">Accounts</h3>
        {profile.accounts.map((a) => (
          <div key={a.id} className="flex justify-between items-center text-sm rounded-lg bg-black/[.03] px-3 py-2">
            <span>{a.label} · {FIRMS[a.firmKey].name} · {usd(a.balance)}</span>
            <button className="text-t3 hover:text-red text-xs" onClick={() => removeAccount(a.id)}>remove</button>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <label className="block"><span className="lbl">Firm</span><select className="inp" value={firmKey} onChange={(e) => { setFirmKey(e.target.value); setBal(FIRMS[e.target.value].start); }}>{firmKeys.map((k) => <option key={k} value={k}>{FIRMS[k].name}</option>)}</select></label>
          <label className="block"><span className="lbl">Balance</span><input type="number" className="inp w-28" value={bal} onChange={(e) => setBal(+e.target.value)} /></label>
          <button className="btn btn-ghost" onClick={addAccount}>Add</button>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="font-semibold">AI Coach</h3>
        <label className="block"><span className="lbl">Anthropic API key (optional, stored only in your browser)</span>
          <input className="inp" type="password" value={profile.settings.anthropicKey || ""} onChange={(e) => set("anthropicKey", e.target.value)} placeholder="sk-ant-…" /></label>
        <p className="text-[.74rem] text-t3">Without a key, the coach uses built-in rule-based guidance. With one, it answers with Claude, grounded in your stats.</p>
      </section>

      <section className="card p-5">
        <h3 className="font-semibold mb-2">Demo data</h3>
        <p className="text-[.8rem] text-t2 mb-2">Fill the whole suite with a realistic funded trader to see every tool alive.</p>
        <button className="btn btn-primary text-sm" onClick={() => setProfile(demoProfile(profile))}>Load demo data</button>
      </section>

      <section className="card p-5">
        <h3 className="font-semibold mb-2">Reset</h3>
        <button className="btn btn-ghost text-red border-red/30" onClick={() => { if (confirm("Erase your profile, accounts, and trades from this browser?")) { clearProfile(); setProfile({ ...DEFAULT_PROFILE }); } }}>Erase my data</button>
      </section>
    </div>
  );
}
