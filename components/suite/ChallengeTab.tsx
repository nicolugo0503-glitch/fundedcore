"use client";
import { type Profile } from "../../lib/profile";
import { assessAccount } from "../../lib/risk";
import { usd } from "../../lib/format";

export function ChallengeTab({ profile }: { profile: Profile }) {
  const evals = profile.accounts.filter((a) => assessAccount(a).firm.profitTarget > 0);
  if (!evals.length) return <div className="card p-8 text-center text-t3">No evaluation accounts to track. Add an evaluation (challenge) account in Settings to see pass-progress, required daily P&L, and probability of passing.</div>;

  return (
    <div className="space-y-5 fade">
      <div><div className="eyebrow">Challenge tracker</div><h1 className="text-2xl font-bold mt-1">Pass on time, without blowing up</h1></div>
      {evals.map((a) => {
        const r = assessAccount(a);
        const target = r.firm.profitTarget;
        const progress = Math.max(0, Math.min(1, r.netPnL / target));
        const remaining = Math.max(0, target - r.netPnL);
        const daysAssumed = 20; // illustrative funding window
        const daysLeft = Math.max(1, daysAssumed - a.daysTraded);
        const reqDaily = remaining / daysLeft;
        // crude probability: based on buffer + progress
        const prob = Math.round(Math.max(5, Math.min(95, progress * 60 + r.pctBuffer * 30 + 10)));
        return (
          <div key={a.id} className="card p-6">
            <div className="flex justify-between items-start"><div><div className="font-semibold">{a.label}</div><div className="text-[.78rem] text-t3">{r.firm.name}</div></div>
              <span className="chip" style={{ borderColor: "#3B82F655", color: "#60A5FA" }}>{prob}% on track</span></div>
            <div className="mt-4"><div className="flex justify-between text-[.8rem] text-t3"><span>profit target</span><span>{usd(Math.max(0, r.netPnL))} / {usd(target)}</span></div>
              <div className="h-3 rounded-full bg-white/[.06] overflow-hidden mt-1"><div className="h-full rounded-full bg-acc" style={{ width: `${progress * 100}%` }} /></div></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <Stat label="Remaining" value={usd(remaining)} />
              <Stat label="Days traded" value={String(a.daysTraded)} />
              <Stat label="Req. daily P&L" value={usd(reqDaily)} />
              <Stat label="Breach buffer" value={usd(Math.max(0, r.distanceToBreach))} />
            </div>
            <p className="text-[.78rem] text-t3 mt-3">Funding window and probability are illustrative estimates. Edit days traded in your account data.</p>
          </div>
        );
      })}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="lbl">{label}</div><div className="mono font-semibold">{value}</div></div>;
}
