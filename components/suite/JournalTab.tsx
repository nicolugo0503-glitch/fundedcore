"use client";
import { useRef } from "react";
import { type Profile } from "../../lib/profile";
import { parseTradesCsv } from "../../lib/csv";
import { scoreTrades } from "../../lib/score";
import { sampleById } from "../../lib/sampleTraders";
import { ScoreReport } from "../ScoreReport";
import { usd, pct } from "../../lib/format";
import { SuiteHeader } from "./ui";

export function JournalTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      const res = parseTradesCsv(String(r.result || ""));
      if (!res.trades.length) return;
      // uploading your own trades clears any demo/sample accounts so nothing pretends to be your account
      const realAccounts = profile.accounts.filter((a) => !["a1", "a2", "a3"].includes(a.id));
      setProfile({ ...profile, trades: res.trades, accounts: profile.demo ? [] : realAccounts, demo: false });
    };
    r.readAsText(f);
  }
  const recent = [...profile.trades].slice(-15).reverse();
  const score = profile.trades.length >= 5 ? scoreTrades(profile.trades) : null;

  return (
    <div className="space-y-5 fade">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <SuiteHeader eyebrow="Journal & Score" title="Your verified edge" />
        <div className="flex gap-2">
          <button className="btn btn-ghost text-sm" onClick={() => fileRef.current?.click()}>↑ Upload CSV</button>
          <button className="btn btn-ghost text-sm" onClick={() => { if (profile.trades.length && !confirm("Replace your loaded trades with the sample trader?")) return; const s = sampleById("maya")!; setProfile({ ...profile, trades: s.trades, demo: true }); }}>Use sample</button>
          {score && <button className="btn btn-primary text-sm" onClick={() => downloadCard(profile.name, score)}>⤓ Score card</button>}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
      </div>

      {score ? <ScoreReport r={score} name={profile.name} /> : (
        <div className="card p-8 text-center text-t3">Upload your trade history (or use a sample) to compute your Trader Score and unlock Insights + the Daily Brief.</div>
      )}

      {recent.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Recent trades</h3>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Symbol</th><th>Setup</th><th>Side</th><th className="text-right">P&L</th></tr></thead>
              <tbody>{recent.map((t) => (
                <tr key={t.id}><td className="mono text-t2">{t.date}</td><td className="mono">{t.symbol || "—"}</td><td className="text-t2">{t.tag || "—"}</td><td className="capitalize text-t2">{t.side || "—"}</td>
                  <td className={`text-right mono ${t.pnl >= 0 ? "text-grn" : "text-red"}`}>{t.pnl >= 0 ? "+" : ""}{usd(t.pnl)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Shareable score card: draws a PNG on a canvas and downloads it.
function downloadCard(name: string, score: ReturnType<typeof scoreTrades>) {
  const W = 1000, H = 540;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); if (!x) return;
  // bg
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#040b1c"); g.addColorStop(1, "#0a1830");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // glow
  const rg = x.createRadialGradient(W - 180, 80, 0, W - 180, 80, 420);
  rg.addColorStop(0, "rgba(59,130,246,.30)"); rg.addColorStop(1, "rgba(59,130,246,0)");
  x.fillStyle = rg; x.fillRect(0, 0, W, H);
  // brand
  x.fillStyle = "#F0F4FF"; x.font = "700 34px 'Space Grotesk', sans-serif";
  x.fillText("Funded", 56, 80);
  x.fillStyle = "#3B82F6"; x.fillText("Core", 56 + x.measureText("Funded").width, 80);
  x.fillStyle = "#64748B"; x.font = "500 18px Inter, sans-serif";
  x.fillText("VERIFIED-STYLE TRADER SCORE", 56, 112);
  // score
  const col = score.traderScore >= 78 ? "#10B981" : score.traderScore >= 62 ? "#F59E0B" : "#EF4444";
  x.fillStyle = col; x.font = "800 170px 'JetBrains Mono', monospace";
  x.fillText(String(score.traderScore), 56, 300);
  x.font = "700 56px 'JetBrains Mono', monospace";
  x.fillText(score.grade, 56 + 105 * String(score.traderScore).length, 300);
  // name + stats
  x.fillStyle = "#F0F4FF"; x.font = "600 30px Inter, sans-serif";
  x.fillText(name, 56, 370);
  x.fillStyle = "#94A3B8"; x.font = "500 22px Inter, sans-serif";
  const a = score.analytics;
  const stats = [
    `Win rate ${pct(a.winRate)}`, `Profit factor ${a.profitFactor.toFixed(2)}`,
    `Net ${usd(a.totalPnl)}`, `${a.trades} trades / ${a.spanDays}d`,
  ];
  stats.forEach((t, i) => x.fillText(t, 56 + (i % 2) * 320, 420 + Math.floor(i / 2) * 38));
  // footer
  x.fillStyle = "#475569"; x.font = "500 18px Inter, sans-serif";
  x.fillText("fundedcore — the $5 trader suite", 56, H - 36);
  const a2 = document.createElement("a");
  a2.href = c.toDataURL("image/png"); a2.download = "trader-score.png"; a2.click();
}
