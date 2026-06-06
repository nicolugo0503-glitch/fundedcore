"use client";
import { type Profile } from "../../lib/profile";
import { simulateAll } from "../../lib/simulator";
import { usd } from "../../lib/format";
import { SuiteHeader } from "./ui";

const OUT: Record<string, { label: string; color: string }> = {
  passed: { label: "PASSED", color: "#10B981" },
  survived: { label: "SURVIVED", color: "#F59E0B" },
  breached: { label: "BLOWN", color: "#EF4444" },
};

export function SimulatorTab({ profile }: { profile: Profile }) {
  if (profile.trades.length < 10) return <div className="card p-8 text-center text-t3">Add at least ~10 trades (Journal tab) and the simulator will replay your real trading against every firm's rulebook.</div>;
  const results = simulateAll(profile.trades);
  const best = results[0];

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Firm Simulator" title="Which firm would your trading actually survive?" sub={`Your real ${profile.trades.length} trades, replayed against every rulebook.`} />

      {best && best.outcome !== "breached" && (
        <div className="card p-5" style={{ borderColor: "#10B98155" }}>
          <span className="text-grn font-semibold">Best fit: {best.firm.name}</span>
          <span className="text-t2 text-sm"> — {best.outcome === "passed" ? `you'd have passed in ${best.passOnDay} trading days` : `you'd have survived the full sample`} with {usd(best.finalPnl)} P&L.</span>
        </div>
      )}

      <div className="card p-2 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Firm / account</th><th>Outcome</th><th>When</th><th>Daily-loss hits</th><th>Worst squeeze</th><th className="text-right">Final P&L</th></tr></thead>
          <tbody>
            {results.map((r) => {
              const o = OUT[r.outcome];
              return (
                <tr key={r.firmKey}>
                  <td><div className="font-medium">{r.firm.name}</div><div className="text-[.72rem] text-t3">{r.firm.drawdownType.replace("_", " ")} · DD {usd(r.firm.trailingDD)}{r.firm.dailyLoss ? ` · daily ${usd(r.firm.dailyLoss)}` : ""}</div></td>
                  <td><span className="chip" style={{ borderColor: o.color + "66", color: o.color }}>{o.label}</span></td>
                  <td className="text-t2">{r.outcome === "passed" ? `day ${r.passOnDay}` : r.outcome === "breached" ? `day ${r.breachOnDay}` : `${r.tradingDays}d clean`}</td>
                  <td className="text-t2">{r.dailyLossHits || "—"}</td>
                  <td className="mono text-t2">{usd(r.maxDD)} used</td>
                  <td className={`text-right mono font-medium ${r.finalPnl >= 0 ? "text-grn" : "text-red"}`}>{usd(r.finalPnl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[.7rem] t-t3 text-t3">Historical replay on your sample — not a guarantee. Rule snapshots are illustrative.</p>
    </div>
  );
}
