"use client";
import { useEffect, useMemo, useState } from "react";
import { type Profile } from "../../lib/profile";
import { defaultCommitment, evalLock, type Commitment } from "../../lib/lockin";
import { SuiteHeader, Panel } from "./ui";
import { Icon } from "../Icon";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;

export function SessionLockTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 15000); return () => clearInterval(i); }, []);
  const [form, setForm] = useState<Commitment>(profile.lockin?.armed ? profile.lockin : defaultCommitment(profile.settings));
  const [confirm, setConfirm] = useState("");

  const c = profile.lockin ?? defaultCommitment(profile.settings);
  const live = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = profile.trades.filter((t) => t.date === today);
    const dayPnl = rows.reduce((a, t) => a + t.pnl, 0);
    let consec = 0; for (let i = rows.length - 1; i >= 0; i--) { if (rows[i].pnl < 0) consec++; else break; }
    return { dayPnl, tradesToday: rows.length, consecLosses: consec };
  }, [profile.trades, tick]);
  const st = useMemo(() => evalLock(c, live), [c, live, tick]);

  function armIt() { setProfile({ ...profile, lockin: { ...form, armed: true, armedAt: Date.now() } }); }
  function disarm() { if (confirm.trim().toLowerCase() !== "i accept the risk") return; setProfile({ ...profile, lockin: { ...c, armed: false } }); setConfirm(""); }

  const minsLeft = Math.max(0, Math.ceil((st.canDisarmAt - Date.now()) / 60000));

  if (!c.armed) {
    const set = (k: keyof Commitment, v: number) => setForm({ ...form, [k]: v });
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Session Lock-In" title="Commit to your rules — before you can break them." sub="Set your lines while you're calm. Once you lock in, you can't loosen them mid-tilt. FundedCore holds you to the plan when your worst self shows up." />
        <div className="card p-6 max-w-2xl">
          <div className="grid sm:grid-cols-2 gap-4">
            <label><span className="lbl">Daily loss stop ($)</span><input type="number" min={0} className="inp" value={form.dailyLossStop} onChange={(e) => set("dailyLossStop", Math.max(0, +e.target.value))} /></label>
            <label><span className="lbl">Max trades today</span><input type="number" min={1} className="inp" value={form.maxTrades} onChange={(e) => set("maxTrades", Math.max(1, +e.target.value))} /></label>
            <label><span className="lbl">Stop after N losses in a row</span><input type="number" min={1} className="inp" value={form.stopAfterLosses} onChange={(e) => set("stopAfterLosses", Math.max(1, +e.target.value))} /></label>
            <label><span className="lbl">Disarm cooldown (minutes)</span><input type="number" min={0} className="inp" value={form.disarmCooldownMin} onChange={(e) => set("disarmCooldownMin", Math.max(0, +e.target.value))} /></label>
          </div>
          <div className="text-[.78rem] text-t3 mt-3 flex items-start gap-1.5"><Icon name="alert" size={13} /> The cooldown is the point: once armed you can't disarm for {form.disarmCooldownMin} minutes. Set your lines tighter than your firm's, then commit.</div>
          <button onClick={armIt} className="btn btn-primary w-full mt-5 !py-3 text-[.95rem]">Lock in my session →</button>
        </div>
      </div>
    );
  }

  const breached = st.breached;
  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Session Lock-In" title="Your pact is live" sub="You committed to these lines when you were calm. Honor them." />

      <div className="card p-6" style={{ borderColor: breached ? "rgba(239,68,68,.5)" : "rgba(52,211,153,.4)", background: breached ? "rgba(239,68,68,.06)" : "rgba(52,211,153,.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: breached ? "rgba(239,68,68,.14)" : "rgba(52,211,153,.14)", color: breached ? "var(--red)" : "var(--grn)" }}><Icon name={breached ? "alert" : "shield"} size={24} /></div>
          <div>
            <div className="text-xl font-bold" style={{ color: breached ? "var(--red)" : "var(--grn)" }}>{breached ? "LOCKDOWN — you hit your own line." : "ARMED — you're protected."}</div>
            <div className="text-[.85rem] text-t2">{breached ? "Step away. The account you keep is the one you don't fight to get back." : "Trade your plan. The lines below are set."}</div>
          </div>
        </div>
        {breached && (
          <div className="mt-3 space-y-1">
            {st.violations.map((v) => <div key={v.key} className="text-[.85rem]" style={{ color: "var(--red)" }}>⛔ <b>{v.label}</b> — {v.detail}</div>)}
            <div className="text-[.78rem] text-t3 mt-1">Connected live? Flatten now in <b>Broker Link</b>. FundedCore holds the line; it doesn't place orders for you.</div>
          </div>
        )}
      </div>

      <Panel title="Your committed lines" icon={<Icon name="gauge" />}>
        <div className="space-y-4">
          {st.usage.map((u) => (
            <div key={u.key}>
              <div className="flex justify-between text-[.84rem] mb-1"><span className="text-t1 font-medium">{u.label}</span><span className="mono" style={{ color: u.hot ? "var(--red)" : "var(--t2)" }}>{u.value}</span></div>
              <div className="h-2.5 rounded-full" style={{ background: "rgba(127,127,127,0.12)" }}><div className="h-full rounded-full" style={{ width: Math.round(u.pct * 100) + "%", background: u.pct >= 1 ? "var(--red)" : u.hot ? "var(--amb,#f5a623)" : "var(--grn)", transition: "width .4s" }} /></div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="End session" icon={<Icon name="lock" />}>
        {!st.disarmable ? (
          <div className="text-[.88rem] text-t2">Your pact is locked for <b className="text-t1">{minsLeft} more minute{minsLeft === 1 ? "" : "s"}</b>. That's the whole point — you can't quit on yourself mid-session. Come back when the cooldown ends.</div>
        ) : (
          <div>
            <div className="text-[.85rem] text-t2 mb-2">Cooldown's up. To disarm, type <b className="text-t1">I accept the risk</b>:</div>
            <div className="flex gap-2 flex-wrap">
              <input className="inp !py-2 max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="I accept the risk" />
              <button onClick={disarm} disabled={confirm.trim().toLowerCase() !== "i accept the risk"} className="btn btn-ghost text-sm">Disarm & end session</button>
            </div>
          </div>
        )}
      </Panel>

      <p className="text-[.72rem] text-t3">Session Lock-In is a discipline commitment enforced inside FundedCore — it holds you to your own rules and can't be loosened mid-session. It does not place or block orders at your broker; for a real broker-side kill-switch use the Auto-Guardian in Broker Link.</p>
    </div>
  );
}
