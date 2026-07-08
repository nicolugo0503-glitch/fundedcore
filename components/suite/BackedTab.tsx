"use client";
import { useMemo, useState } from "react";
import { type Profile } from "../../lib/profile";
import { allocationReadiness } from "../../lib/backed";
import { SuiteHeader, Ring, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const TIER_COL: Record<string, string> = {
  Backable: "var(--grn)",
  Watchlist: "var(--amb,#f5a623)",
  Building: "var(--red)",
};

export function BackedTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [accId, setAccId] = useState(profile.accounts[0]?.id || "");
  const acc = profile.accounts.find((a) => a.id === accId) || profile.accounts[0] || null;
  const r = useMemo(() => allocationReadiness(profile.trades, acc), [profile.trades, acc]);
  const onList = !!profile.backedWaitlist;

  if (!r.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Get Backed" title="Get backed with real capital."
          sub="The disciplined few don't need to keep paying for evaluations. Prove it with your own data — and get backed." />
        <EmptyState icon="up" title="Nothing to score yet" body={r.headline} />
      </div>
    );
  }

  const col = TIER_COL[r.tier];
  const met = r.requirements.filter((x) => x.met).length;
  const facts =
    `Allocation-readiness score ${r.score}/100, tier ${r.tier}. ${met} of ${r.requirements.length} gates met: ` +
    r.requirements.map((x) => `${x.label} ${x.met ? "PASS" : "not yet"} (${x.detail})`).join("; ") + ".";

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Get Backed" title="Get backed with real capital."
        sub="Prop firms profit when you keep re-buying challenges. FundedCore flips it: prove discipline on your own data and get backed — no re-buys, a share of the profits, the same Guardian watching the capital."
        right={<span className="chip" style={{ color: col }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: col }} /> {r.tier}</span>} />

      <div className="grid md:grid-cols-[auto,1fr] gap-5 items-center card p-6">
        <div className="flex justify-center">
          <Ring pct={r.score / 100} color={col} size={150} stroke={12}>
            <div className="mono font-bold leading-none" style={{ fontSize: "2.4rem", color: col }}>{r.score}</div>
            <div className="lbl mb-0 mt-1">readiness</div>
          </Ring>
        </div>
        <div>
          <div className="eyebrow" style={{ color: col }}>{r.tier}</div>
          <div className="text-lg font-semibold mt-1" style={{ maxWidth: "44ch" }}>{r.headline}</div>
          {profile.accounts.length > 1 && (
            <select value={accId} onChange={(e) => setAccId(e.target.value)}
              className="mt-3 bg-transparent border border-[var(--line2)] rounded-lg px-3 py-1.5 text-sm">
              {profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.id}</option>)}
            </select>
          )}
        </div>
      </div>

      <Panel title="What qualifies you" icon={<Icon name="check" />}>
        <div className="space-y-2.5">
          {r.requirements.map((x) => (
            <div key={x.label} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[.8rem]"
                style={{ background: x.met ? "color-mix(in srgb, var(--grn) 18%, transparent)" : "var(--line1)", color: x.met ? "var(--grn)" : "var(--t3)", border: `1px solid ${x.met ? "var(--grn)" : "var(--line2)"}` }}>
                {x.met ? "✓" : "•"}
              </span>
              <span className="text-sm font-medium" style={{ color: x.met ? "var(--t1)" : "var(--t2)" }}>{x.label}</span>
              <span className="text-[.76rem] text-t3 ml-auto">{x.detail}</span>
            </div>
          ))}
        </div>
      </Panel>

      {r.qualifies ? (
        onList ? (
          <div className="card p-6 text-center" style={{ borderColor: "color-mix(in srgb, var(--grn) 40%, var(--line2))" }}>
            <div className="text-2xl mb-1">✓</div>
            <div className="text-lg font-bold" style={{ color: "var(--grn)" }}>You're on the waitlist.</div>
            <p className="text-sm text-t2 mt-1.5 mx-auto" style={{ maxWidth: "48ch" }}>
              Your data puts you in the backable tier. When the allocation program opens, backed traders are picked from this list &mdash; highest, most consistent readiness first. Keep your score up; it's re-checked from your live trades.
            </p>
            <button onClick={() => setProfile({ ...profile, backedWaitlist: false })}
              className="text-[.76rem] text-t3 underline mt-4">Leave the waitlist</button>
          </div>
        ) : (
          <div className="card p-6 text-center" style={{ borderColor: "color-mix(in srgb, var(--grn) 40%, var(--line2))" }}>
            <div className="text-lg font-bold" style={{ color: "var(--grn)" }}>Your discipline qualifies you.</div>
            <p className="text-sm text-t2 mt-1.5 mx-auto" style={{ maxWidth: "48ch" }}>
              You're in the top tier on the metrics that predict who keeps an account. Join the waitlist to be considered for real capital when the allocation program opens.
            </p>
            <button onClick={() => setProfile({ ...profile, backedWaitlist: true })}
              className="btn btn-primary mt-4">Apply to be backed →</button>
          </div>
        )
      ) : (
        <div className="card p-5 text-center">
          <p className="text-sm text-t2 mx-auto" style={{ maxWidth: "48ch" }}>
            You're at <b style={{ color: col }}>{r.score}/100</b>. Close the gaps above &mdash; every one is measured from your real trades &mdash; and the door to backing opens. No shortcuts, no re-buys. Just the track record.
          </p>
        </div>
      )}

      <AIRead module="backed" facts={facts} />

      <p className="text-[.72rem] text-t3 leading-relaxed" style={{ maxWidth: "70ch" }}>
        This is a selection score and a waitlist &mdash; not an offer of funding, investment advice, or a guarantee. FundedCore is not a broker, fund, or registered adviser. A capital-allocation program, if and when it launches, would be subject to its own terms, eligibility, and regulatory requirements. Nothing here moves money.
      </p>
    </div>
  );
}
