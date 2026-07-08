"use client";
import { useMemo, useState } from "react";
import { type Profile } from "../../lib/profile";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { assessAccount } from "../../lib/risk";
import { usd, pct } from "../../lib/format";
import { memoryFacts, memoryBrief, proactiveNudge } from "../../lib/coachmemory";
import { SuiteHeader, Panel } from "./ui";
import { Icon } from "../Icon";

const QUICK = ["What's my biggest flaw?", "Will I blow this account?", "Which setups should I cut?", "How should I size today?"];
const SEV: Record<string, string> = { high: "var(--red)", med: "var(--amb,#f5a623)", low: "var(--amb,#f5a623)", calm: "var(--grn)" };

function buildContext(p: Profile): string {
  const lines: string[] = [`Name: ${p.name}. Accounts: ${p.accounts.length}. Trades logged: ${p.trades.length}.`];
  for (const a of p.accounts) {
    const r = assessAccount(a);
    lines.push(`- ${a.label} (${r.firm.name}): balance ${usd(a.balance)}, distance to breach ${usd(Math.max(0, r.distanceToBreach))}, status ${r.status}.`);
  }
  if (p.trades.length >= 5) {
    const s = scoreTrades(p.trades); const ins = analyze(p.trades);
    lines.push(`Trader Score ${s.traderScore}/${s.grade}. Win rate ${pct(s.analytics.winRate)}, profit factor ${s.analytics.profitFactor.toFixed(2)}, expectancy ${usd(s.analytics.expectancy)}/trade.`);
    if (ins.leaks[0]) lines.push(`Top leak: ${ins.leaks[0].title} — ${ins.leaks[0].detail}`);
    if (ins.bestWindow) lines.push(`Best hour: ${ins.bestWindow.key} UTC (+${usd(ins.bestWindow.net)}).`);
  }
  return lines.join("\n") + "\n\n" + memoryBrief(p);
}

export function CoachTab({ profile, setProfile }: { profile: Profile; setProfile?: (p: Profile) => void }) {
  const facts = useMemo(() => memoryFacts(profile), [profile.trades, profile.accounts]);
  const nudge = useMemo(() => proactiveNudge(profile), [profile.trades, profile.accounts, profile.settings]);
  const [msgs, setMsgs] = useState<{ role: "user" | "coach"; text: string }[]>([
    { role: "coach", text: `Hey ${profile.name}. I remember your account, your leaks, and your goals — so this isn't generic advice. Ask me anything, or tap a question below.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState("");
  const goals = profile.coachGoals || [];

  function addGoal() { if (!goal.trim() || !setProfile) return; setProfile({ ...profile, coachGoals: [...goals, goal.trim()].slice(0, 6) }); setGoal(""); }
  function rmGoal(i: number) { if (!setProfile) return; setProfile({ ...profile, coachGoals: goals.filter((_, k) => k !== i) }); }

  async function send(q: string) {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json", ...(profile.settings.anthropicKey ? { "x-anthropic-key": profile.settings.anthropicKey } : {}) },
        body: JSON.stringify({ message: q, context: buildContext(profile) }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "coach", text: d.text || "…" }]);
    } catch {
      setMsgs((m) => [...m, { role: "coach", text: "Couldn't reach the coach. Try again." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 fade">
      <SuiteHeader eyebrow="AI Coach" title="A coach that remembers you" sub="It knows your archetype, your recurring leaks, your best window, and your goals — and it nudges you at the moments that matter." />

      {nudge && (
        <div className="card p-4 flex items-start gap-3" style={{ borderColor: SEV[nudge.severity] + "66", background: SEV[nudge.severity] + "12" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: SEV[nudge.severity] + "22", color: SEV[nudge.severity] }}><Icon name={nudge.severity === "calm" ? "check" : "alert"} size={18} /></div>
          <div><div className="text-[.7rem] font-bold uppercase tracking-wide" style={{ color: SEV[nudge.severity] }}>{nudge.trigger}</div><div className="text-[.9rem] text-t1 mt-0.5 leading-snug">{nudge.message}</div></div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="What your coach remembers" icon={<Icon name="brain" />}>
          {facts.length ? (
            <div className="space-y-2">
              {facts.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[.86rem]">
                  <span className="text-t3"><Icon name={f.icon as any} size={14} /></span>
                  <span className="text-t3">{f.label}:</span> <span className="text-t1 font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-t3 text-sm">Sync or upload trades and I'll start remembering your patterns.</div>}
        </Panel>
        <Panel title="Your goals (I'll hold you to these)" icon={<Icon name="target" />}>
          <div className="space-y-1.5">
            {goals.map((g, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[.86rem]"><span className="text-t1">• {g}</span>{setProfile && <button onClick={() => rmGoal(i)} className="text-t3 hover:text-red text-xs">remove</button>}</div>
            ))}
            {!goals.length && <div className="text-t3 text-sm">e.g. "Stop after 2 losses" · "Only trade 9:30–11:00" · "Max 4 trades a day"</div>}
          </div>
          {setProfile && (
            <div className="flex gap-2 mt-3">
              <input className="inp !py-1.5 text-sm" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} placeholder="Add a goal…" />
              <button onClick={addGoal} className="btn btn-ghost text-sm shrink-0">Add</button>
            </div>
          )}
        </Panel>
      </div>

      <div className="card p-4 min-h-[300px] flex flex-col">
        <div className="flex-1 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[.9rem] ${m.role === "user" ? "bg-acc/20 border border-acc/30" : "bg-black/[.04] border border-black/[.06]"}`}>{m.text}</div>
            </div>
          ))}
          {busy && <div className="text-t3 text-sm">Coach is thinking…</div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK.map((q) => <button key={q} onClick={() => send(q)} className="chip hover:border-acc/50 transition">{q}</button>)}
        </div>
        <div className="flex gap-2 mt-3">
          <input className="inp" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Ask your coach…" />
          <button className="btn btn-primary" onClick={() => send(input)} disabled={busy}>Send</button>
        </div>
      </div>
    </div>
  );
}
