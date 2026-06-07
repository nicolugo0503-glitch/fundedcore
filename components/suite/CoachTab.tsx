"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { assessAccount } from "../../lib/risk";
import { usd, pct } from "../../lib/format";
import { SuiteHeader } from "./ui";

const QUICK = ["What's my biggest flaw?", "Will I blow this account?", "Which setups should I cut?", "How should I size today?"];

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
  return lines.join("\n");
}

export function CoachTab({ profile }: { profile: Profile }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "coach"; text: string }[]>([
    { role: "coach", text: `Hey ${profile.name}. I can see your accounts, trades, score, and leaks. Ask me anything — or tap a question below.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

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
      <SuiteHeader eyebrow="AI Coach" title="Your coach, grounded in your real data" sub="It can see your accounts, trades, score, and leaks — not generic advice." />
      <div className="card p-4 min-h-[320px] flex flex-col">
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
      {!profile.settings.anthropicKey && <p className="text-[.72rem] text-t3">Tip: add your Anthropic API key in Settings for fully AI-personalized coaching. Without it you get solid rule-based guidance.</p>}
    </div>
  );
}
