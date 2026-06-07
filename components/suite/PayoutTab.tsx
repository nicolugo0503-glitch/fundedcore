"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { payoutPlan } from "../../lib/payout";
import { usd, pct } from "../../lib/format";
import { SuiteHeader, Panel, StatTile } from "./ui";
import { Icon } from "../Icon";

export function PayoutTab({ profile }: { profile: Profile }) {
  const [sel, setSel] = useState(profile.accounts[0]?.id || "");
  const [split, setSplit] = useState(90);
  if (!profile.accounts.length) return <div className="card p-8 text-center text-t3">Add an account in Settings to plan payouts.</div>;
  const account = profile.accounts.find((a) => a.id === sel) || profile.accounts[0];
  const p = payoutPlan(account, profile.trades, split / 100);

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Payout timing" title="When to withdraw — and how much" sub="Eligibility, what's blocking you, and the largest compliant payout that still keeps a safe cushion above breach." right={
        <div className="flex gap-2">
          <select className="inp !py-1.5 text-sm" value={account.id} onChange={(e) => setSel(e.target.value)}>{profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
          <label className="inp !py-1.5 text-sm flex items-center gap-1">split <input type="number" className="bg-transparent outline-none w-10" value={split} onChange={(e) => setSplit(Math.max(50, Math.min(100, +e.target.value)))} />%</label>
        </div>} />

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: p.eligible ? "color-mix(in srgb, var(--grn) 14%, transparent)" : "color-mix(in srgb, var(--amb) 14%, transparent)", color: p.eligible ? "var(--grn)" : "var(--amb)", border: "1px solid " + (p.eligible ? "color-mix(in srgb, var(--grn) 35%, transparent)" : "color-mix(in srgb, var(--amb) 35%, transparent)") }}><Icon name={p.eligible ? "check" : "clock"} size={20} /></span>
          <div><div className="lbl mb-0.5">Payout status</div><div className="display text-[1.4rem] font-bold leading-none" style={{ color: p.eligible ? "var(--grn)" : "var(--amb)" }}>{p.eligible ? "READY TO WITHDRAW" : "NOT YET"}</div></div>
        </div>
        <p className="text-[.92rem] text-t1 leading-relaxed">{p.summary}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile icon={<Icon name="calc" size={15} />} label="Account profit" value={usd(p.profit)} accent={p.profit >= 0 ? "var(--grn)" : "var(--red)"} />
        <StatTile icon={<Icon name="arrow" size={15} />} label="Recommended withdrawal" value={usd(p.recommendedWithdrawal)} accent="var(--acc)" />
        <StatTile icon={<Icon name="check" size={15} />} label={"Net after " + split + "% split"} value={usd(p.netToTrader)} accent="var(--grn)" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Requirements" icon={<Icon name="target" />}>
          {p.blockers.length ? <ul className="space-y-2.5">{p.blockers.map((b, i) => <li key={i} className="flex gap-2.5 text-[.86rem] text-t1"><span className="text-amb mt-0.5 shrink-0">○</span>{b}</li>)}</ul>
            : <div className="text-[.88rem]" style={{ color: "var(--grn)" }}>✓ All payout requirements met.</div>}
        </Panel>
        <Panel title="Consistency rule" icon={<Icon name="gauge" />}>
          {p.consistencyLimit === 0 ? <div className="text-[.86rem] text-t3 py-2">This firm has no consistency rule.</div> : (
            <div>
              <div className="flex justify-between text-[.82rem] mb-1"><span className="text-t2">Best day as % of profit</span><span className="mono font-semibold" style={{ color: p.consistencyOk ? "var(--grn)" : "var(--red)" }}>{pct(p.consistencyPct)} / {pct(p.consistencyLimit)} limit</span></div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--panel2)" }}><div className="h-full" style={{ width: Math.min(100, (p.consistencyPct / Math.max(p.consistencyLimit, 0.01)) * 100) + "%", background: p.consistencyOk ? "var(--grn)" : "var(--red)" }} /></div>
              {!p.consistencyOk && <p className="text-[.8rem] text-t2 mt-2.5">Your best day is too large a share of profit. Earn <b className="text-t1">{usd(p.needForConsistency)}</b> more on other days to dilute it under the limit.</p>}
            </div>
          )}
        </Panel>
      </div>
      <p className="text-[.7rem] text-t3">Payout rules are illustrative per firm — always confirm exact terms with your provider before requesting.</p>
    </div>
  );
}
