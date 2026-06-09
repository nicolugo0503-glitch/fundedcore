"use client";
import { type Profile, demoProfile } from "../../lib/profile";
import { preMortem, type Signal } from "../../lib/premortem";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const BAND: Record<string, { color: string; label: string; verb: string }> = {
  high: { color: "var(--red)", label: "HIGH", verb: "This is your danger setup. Trade tiny or sit out." },
  elevated: { color: "var(--amb)", label: "ELEVATED", verb: "Some of your blow-up signals are live — slow down, size down." },
  low: { color: "var(--grn)", label: "LOW", verb: "None of your destructive patterns are active today." },
};

export function PreMortemTab({ profile, setProfile, go }: { profile: Profile; setProfile?: (p: Profile) => void; go?: (t: string) => void }) {
  const pm = preMortem(profile.trades);
  if (!pm.ready) {
    return (
      <div className="fade">
        <SuiteHeader eyebrow="Pre-Mortem · behavioral early-warning" title="Your blow-up fingerprint" sub="The specific way you destroy accounts — learned from your own worst sessions, and matched to today before you trade." />
        <div className="card"><EmptyState icon="alert" title="Need a bit more history" body="Pre-Mortem learns from at least ~12 trading days. Once it has them, it mines your worst sessions, finds what they had in common, and warns you when today matches." cta={<button onClick={() => go && go("journal")} className="btn btn-primary text-sm">Upload your trades →</button>} /></div>
      </div>
    );
  }
  const b = BAND[pm.riskBand];

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Pre-Mortem · behavioral early-warning" title="Your blow-up fingerprint" sub="Mined from your own worst sessions, scored against today — before you trade." />
      <AIRead module="Pre-Mortem" facts={`Blow-up risk ${Math.round(pm.riskToday*100)}% (${pm.riskBand})${pm.preliminary?", preliminary":""}. Signals: ${pm.fingerprint.map(f=>f.label).join("; ")||"none yet"}. ${pm.summary}`} />

      {/* RISK DIAL */}
      <div className="card p-6">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex items-center gap-5">
            <Ring pct={pm.riskToday} color={b.color} size={120} stroke={10}>
              <div className="text-center"><div className="mono text-[1.7rem] font-bold leading-none" style={{ color: b.color }}>{Math.round(pm.riskToday * 100)}%</div><div className="text-[.6rem] text-t3 mt-1">blow-up risk</div></div>
            </Ring>
            <div>
              <div className="lbl mb-1">Today's reading</div>
              <div className="flex items-center gap-2"><div className="display text-[1.5rem] font-bold leading-none" style={{ color: b.color }}>{b.label}</div>{pm.preliminary && <span className="chip" style={{ color: "var(--amb)", borderColor: "color-mix(in srgb, var(--amb) 35%, transparent)" }}>preliminary</span>}</div>
              <div className="text-[.78rem] text-t3 mt-1.5 max-w-[12rem]">{b.verb}</div>
            </div>
          </div>
          <div>
            <p className="text-[.95rem] text-t1 leading-relaxed">{pm.summary}</p>
            <div className="text-[.72rem] text-t3 mt-3">{pm.preliminary ? `Preliminary read from ${pm.sessions} session(s) of trades — these sharpen into a full per-session fingerprint once you have ~12 trading days.` : `Learned from ${pm.sessions} sessions · ${pm.badDays} flagged as blow-up days (worst quartile, below ${Math.round(pm.threshold)}).`}</div>
          </div>
        </div>
      </div>

      {/* ACTIVE vs WATCH */}
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Active right now" icon={<Icon name="alert" />} accent="var(--red)">
          {pm.active.length ? <div className="space-y-2.5">{pm.active.map((s) => <SignalRow key={s.key} s={s} active />)}</div>
            : <div className="text-[.86rem] py-3" style={{ color: "var(--grn)" }}>Clear — none of your danger signals are triggered today.</div>}
        </Panel>
        <Panel title="Watch during the session" icon={<Icon name="clock" />}>
          {pm.watch.length ? <div className="space-y-2.5">{pm.watch.map((s) => <SignalRow key={s.key} s={s} active={false} />)}</div>
            : <div className="text-[.86rem] text-t3 py-3">All your signals are accounted for above.</div>}
        </Panel>
      </div>

      {/* FULL FINGERPRINT */}
      <Panel title="Your blow-up fingerprint" icon={<Icon name="spark" />} action={<span className="text-[.66rem] text-t3 uppercase tracking-wide">ranked by lift</span>}>
        <div className="space-y-3">
          {pm.fingerprint.map((s) => {
            const maxLift = Math.max(...pm.fingerprint.map((x) => x.lift), 1);
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.activeToday === true ? "var(--red)" : s.activeToday === false ? "var(--t3)" : "var(--amb)" }} />
                <span className="text-[.84rem] w-52 shrink-0 truncate" style={{ color: s.activeToday === true ? "var(--t1)" : "var(--t2)", fontWeight: s.activeToday === true ? 600 : 400 }}>
                  {s.label}{s.kind === "live" && <span className="text-t3"> · live</span>}
                </span>
                <div className="flex-1 h-4 rounded relative" style={{ background: "var(--panel2)" }}>
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: (s.lift / maxLift) * 100 + "%", background: s.activeToday === true ? "var(--red)" : "var(--t3)", opacity: s.activeToday === true ? 1 : 0.5 }} />
                </div>
                <span className="mono text-[.78rem] w-20 text-right shrink-0" style={{ color: s.activeToday === true ? "var(--red)" : "var(--t2)" }}>{s.lift.toFixed(1)}× · {Math.round(s.badRate * 100)}%</span>
              </div>
            );
          })}
        </div>
        <div className="text-[.72rem] text-t3 mt-3 leading-relaxed">“Lift” = how much more often a day went bad when that signal was present, vs your baseline. “Live” signals only confirm once you start trading — that's your in-session warning.</div>
      </Panel>
      <p className="text-[.7rem] text-t3">Early-warning from your own record — it sharpens as you log more sessions. Not a guarantee, a pattern.</p>
    </div>
  );
}

function SignalRow({ s, active }: { s: Signal; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ background: "var(--panel2)", border: "1px solid " + (active ? "color-mix(in srgb, var(--red) 28%, transparent)" : "var(--line)") }}>
      <div><div className="text-[.86rem] text-t1">{s.label}</div><div className="text-[.7rem] text-t3 mt-0.5">{s.badSupport}/{s.support} of these days went bad{s.kind === "live" ? " · confirms mid-session" : ""}</div></div>
      <span className="mono text-[.9rem] font-bold shrink-0 ml-3" style={{ color: active ? "var(--red)" : "var(--t3)" }}>{s.lift.toFixed(1)}×</span>
    </div>
  );
}
