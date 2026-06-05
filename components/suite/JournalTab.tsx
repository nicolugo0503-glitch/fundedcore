"use client";
import { useRef } from "react";
import { type Profile } from "../../lib/profile";
import { parseTradesCsv } from "../../lib/csv";
import { scoreTrades } from "../../lib/score";
import { sampleById } from "../../lib/sampleTraders";
import { ScoreReport } from "../ScoreReport";
import { usd } from "../../lib/format";

export function JournalTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => { const res = parseTradesCsv(String(r.result || "")); if (res.trades.length) setProfile({ ...profile, trades: res.trades }); };
    r.readAsText(f);
  }
  const recent = [...profile.trades].slice(-15).reverse();
  const score = profile.trades.length >= 5 ? scoreTrades(profile.trades) : null;

  return (
    <div className="space-y-5 fade">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div><div className="eyebrow">Journal & Score</div><h1 className="text-2xl font-bold mt-1">Your verified edge</h1></div>
        <div className="flex gap-2">
          <button className="btn btn-ghost text-sm" onClick={() => fileRef.current?.click()}>↑ Upload CSV</button>
          <button className="btn btn-ghost text-sm" onClick={() => { const s = sampleById("maya")!; setProfile({ ...profile, trades: s.trades }); }}>Use sample</button>
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
              <thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Size</th><th className="text-right">P&L</th></tr></thead>
              <tbody>{recent.map((t) => (
                <tr key={t.id}><td className="mono text-t2">{t.date}</td><td className="mono">{t.symbol || "—"}</td><td className="capitalize text-t2">{t.side || "—"}</td><td className="mono text-t2">{t.size ?? "—"}</td>
                  <td className={`text-right mono ${t.pnl >= 0 ? "text-grn" : "text-red"}`}>{t.pnl >= 0 ? "+" : ""}{usd(t.pnl)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
