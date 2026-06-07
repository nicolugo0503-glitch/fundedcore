"use client";
import { type Profile } from "../../lib/profile";
import { SuiteHeader } from "./ui";

// Trading plan + pre-session checklist. The ritual that separates pros from tilt.
export function PlanTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const done = profile.checklistDone.date === today ? profile.checklistDone.done : [];
  const allDone = done.length === profile.checklist.length && profile.checklist.length > 0;

  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setProfile({ ...profile, checklistDone: { date: today, done: next } });
  }
  function setPlan(plan: string) { setProfile({ ...profile, plan }); }
  function setItem(i: number, v: string) {
    const checklist = profile.checklist.map((c, j) => (j === i ? v : c));
    setProfile({ ...profile, checklist });
  }
  function addItem() { setProfile({ ...profile, checklist: [...profile.checklist, ""] }); }
  function removeItem(i: number) {
    setProfile({ ...profile, checklist: profile.checklist.filter((_, j) => j !== i), checklistDone: { date: today, done: done.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) } });
  }

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Plan & ritual" title="Your plan, in writing. Your ritual, every day." sub="A written plan and a pre-session ritual mean fewer blown accounts. That's the whole tab." />

      {/* pre-session checklist */}
      <section className="card p-6" style={{ borderColor: allDone ? "#10B98155" : undefined }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Pre-session checklist</h2>
          <span className="chip" style={{ borderColor: allDone ? "#10B98155" : "#F59E0B55", color: allDone ? "#10B981" : "#F59E0B" }}>
            {allDone ? "✓ cleared to trade" : `${done.length}/${profile.checklist.length} — not cleared yet`}
          </span>
        </div>
        <div className="space-y-2">
          {profile.checklist.map((c, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <button onClick={() => toggle(i)}
                className={`w-6 h-6 rounded-md border shrink-0 flex items-center justify-center text-sm transition ${done.includes(i) ? "bg-grn/20 border-grn/60 text-grn" : "border-black/20 text-transparent hover:border-acc/60"}`}>✓</button>
              <input className="inp !border-transparent !bg-transparent !px-1 focus:!border-white/10 flex-1" value={c}
                onChange={(e) => setItem(i, e.target.value)} />
              <button className="text-t3 hover:text-red opacity-0 group-hover:opacity-100 transition" onClick={() => removeItem(i)}>✕</button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost text-sm mt-4" onClick={addItem}>+ Add item</button>
        <p className="text-[.72rem] text-t3 mt-3">Resets every day. Don't take trade one until it's green.</p>
      </section>

      {/* written plan */}
      <section className="card p-6">
        <h2 className="font-semibold mb-3">Trading plan</h2>
        <textarea className="inp min-h-[220px] leading-relaxed" placeholder={"My setups: …\nMy session: …\nMax risk per trade: …\nI do NOT trade when: …\nI stop for the day when: …"}
          value={profile.plan} onChange={(e) => setPlan(e.target.value)} />
        <p className="text-[.72rem] text-t3 mt-2">Saved automatically. If a trade isn't in the plan, it's not a trade — it's a donation.</p>
      </section>
    </div>
  );
}
