"use client";
import { useEffect, useState } from "react";
import { type Profile, clearProfile, DEFAULT_PROFILE, demoProfile } from "../../lib/profile";
import { FIRMS, INSTRUMENTS } from "../../lib/firms";
import { type Account } from "../../lib/risk";
import { usd } from "../../lib/format";
import { SuiteHeader } from "./ui";
import { supabase } from "../../lib/cloud";

const INSTR = Object.keys(INSTRUMENTS);
let _id = 1; const nid = () => "acc" + _id++ + Date.now().toString(36);

export function SettingsTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);

  async function deleteAccount() {
    if (!supabase) { setDelMsg("Cloud sync isn't enabled, so there's no account to delete."); return; }
    if (!confirm("Permanently delete your FundedCore account and ALL synced data?\n\nYou'll be able to sign up again with this email. This cannot be undone.")) return;
    setDeleting(true); setDelMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setDelMsg("You're not signed in."); setDeleting(false); return; }
      const res = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setDelMsg(j.error || "Couldn't delete the account."); setDeleting(false); return; }
      clearProfile();
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e: any) { setDelMsg(e?.message || "Something went wrong."); setDeleting(false); }
  }

  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");
  useEffect(() => { supabase?.auth.getUser().then(({ data }) => setOwnerEmail((data.user?.email || "").toLowerCase())).catch(() => {}); }, []);
  const OWNER = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "nicolugo0503@gmail.com").toLowerCase();
  const isOwner = !!ownerEmail && ownerEmail === OWNER;
  const [subBusy, setSubBusy] = useState(false);
  async function proAction(kind: "checkout" | "portal") {
    if (!supabase) { setSubMsg("Sign in (cloud sync) is required."); return; }
    setSubBusy(true); setSubMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setSubMsg("Sign in first."); setSubBusy(false); return; }
      const r = await fetch("/api/stripe/" + kind, { method: "POST", headers: { Authorization: "Bearer " + token } });
      const j = await r.json();
      if (j.url) { window.location.href = j.url; return; }
      setSubMsg(j.error || "Something went wrong.");
    } catch (e: any) { setSubMsg(e?.message || "Something went wrong."); }
    setSubBusy(false);
  }

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

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">FundedCore Pro</div>
            <div className="text-[.82rem] text-t2">{profile.pro ? "Active — The Mirror & Your Edge are unlocked." : "$29/mo — unlock The Mirror & Your Edge."}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {profile.pro
              ? <>
                  {isOwner && <button onClick={() => { if (confirm("Reset your account to Free? Locks The Mirror + Your Edge (test the paywall).")) setProfile({ ...profile, pro: false }); }} className="btn btn-ghost text-sm">Reset to Free (owner)</button>}
                  <button onClick={() => proAction("portal")} disabled={subBusy} className="btn btn-ghost text-sm">{subBusy ? "Opening…" : "Manage subscription"}</button>
                </>
              : <>
                  {isOwner && <button onClick={() => setProfile({ ...profile, pro: true })} className="btn btn-ghost text-sm">Grant Pro (owner)</button>}
                  <button onClick={() => proAction("checkout")} disabled={subBusy} className="btn btn-primary text-sm">{subBusy ? "…" : "Upgrade — $29/mo"}</button>
                </>}
          </div>
        </div>
        {subMsg && <p className="text-[.8rem] mt-2" style={{ color: "var(--red)" }}>{subMsg}</p>}
      </section>

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

      <section className="card p-5 space-y-2">
        <h3 className="font-semibold">AI Coach</h3>
        <p className="text-[.78rem] text-t2">AI coaching is built in — no setup or API key needed. The coach, briefing and reads are grounded in your real stats.</p>
      </section>

      <section className="card p-5">
        <h3 className="font-semibold mb-2">Demo data</h3>
        <p className="text-[.8rem] text-t2 mb-2">Fill the whole suite with a realistic funded trader to see every tool alive.</p>
        <button className="btn btn-primary text-sm" onClick={() => { if ((profile.trades.length || profile.accounts.length) && !confirm("This replaces your accounts and trades with sample data. Continue?")) return; setProfile(demoProfile(profile)); }}>Load sample data</button>
      </section>

      <section className="card p-5">
        <h3 className="font-semibold mb-2">Reset</h3>
        <button className="btn btn-ghost text-red border-red/30" onClick={() => { if (confirm("Erase your profile, accounts, and trades from this browser?")) { clearProfile(); setProfile({ ...DEFAULT_PROFILE }); } }}>Erase my data</button>
      </section>

      <section className="card p-5" style={{ borderColor: "color-mix(in srgb, var(--red) 32%, transparent)" }}>
        <h3 className="font-semibold mb-1" style={{ color: "var(--red)" }}>Delete account</h3>
        <p className="text-[.8rem] text-t2 mb-3">Permanently delete your FundedCore account and everything synced to it. This frees up your email so you can sign up again. This can&apos;t be undone.</p>
        <button className="btn btn-ghost text-red border-red/30" disabled={deleting} onClick={deleteAccount}>{deleting ? "Deleting\u2026" : "Delete my account permanently"}</button>
        {delMsg && <p className="text-[.8rem] mt-2" style={{ color: "var(--red)" }}>{delMsg}</p>}
      </section>
    </div>
  );
}
