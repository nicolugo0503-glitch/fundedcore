"use client";
import { useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import type { Trade } from "../../lib/score";
import { parseTradesCsv } from "../../lib/csv";
import { scoreTrades } from "../../lib/score";
import { sampleById } from "../../lib/sampleTraders";
import { ScoreReport } from "../ScoreReport";
import { usd, pct } from "../../lib/format";
import { SuiteHeader } from "./ui";

export function JournalTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState("");
  const [preview, setPreview] = useState<Trade[] | null>(null);
  function onImage(f: File) {
    setImgBusy(true); setImgMsg(""); setPreview(null);
    const r = new FileReader();
    r.onload = async () => {
      try {
        const res = await fetch("/api/vision/trades", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: String(r.result || "") }) });
        const j = await res.json();
        if (!res.ok) { setImgMsg(j.error || "Couldn't read that screenshot."); setImgBusy(false); return; }
        if (!j.trades?.length) { setImgMsg("No trades found — try a sharper crop of just the trades table, or upload a CSV."); setImgBusy(false); return; }
        setPreview(j.trades as Trade[]);
      } catch { setImgMsg("Something went wrong — try again or upload a CSV."); }
      finally { setImgBusy(false); }
    };
    r.readAsDataURL(f);
  }
  function importPreview() {
    if (!preview) return;
    const realAccounts = profile.accounts.filter((a) => !["a1", "a2", "a3"].includes(a.id));
    setProfile({ ...profile, trades: preview, accounts: profile.demo ? [] : realAccounts, demo: false });
    setPreview(null); setImgMsg(`Imported ${preview.length} trades.`);
  }
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
          <button className="btn btn-ghost text-sm" onClick={() => imgRef.current?.click()} disabled={imgBusy}>{imgBusy ? "Reading…" : "📷 From screenshot"}</button>
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.currentTarget.value = ""; }} />
          <button className="btn btn-ghost text-sm" onClick={() => { if (profile.trades.length && !confirm("Replace your loaded trades with the sample trader?")) return; const s = sampleById("maya")!; setProfile({ ...profile, trades: s.trades, demo: true }); }}>Use sample</button>
          {score && <button className="btn btn-primary text-sm" onClick={() => downloadCard(profile.name, score)}>⤓ Score card</button>}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
      </div>

      {imgMsg && <div className="card p-3 text-[.84rem]" style={{ color: imgMsg.startsWith("Imported") ? "var(--grn)" : "var(--red)" }}>{imgMsg}</div>}
      {preview && (
        <div className="card p-4" style={{ borderColor: "color-mix(in srgb, var(--acc) 35%, var(--line2))" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><div className="font-semibold">Found {preview.length} trades in your screenshot</div><div className="text-[.78rem] text-t3">AI-extracted — verify before importing. Vision can misread numbers.</div></div>
            <div className="flex gap-2"><button className="btn btn-ghost text-sm" onClick={() => setPreview(null)}>Cancel</button><button className="btn btn-primary text-sm" onClick={importPreview}>Import {preview.length} trades →</button></div>
          </div>
          <div className="overflow-x-auto mt-3"><table className="tbl"><thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Size</th><th className="text-right">P&amp;L</th></tr></thead><tbody>
            {preview.slice(0, 8).map((t, i) => <tr key={i}><td className="mono">{t.date}</td><td className="mono">{t.symbol || "—"}</td><td>{t.side || "—"}</td><td className="mono">{t.size ?? "—"}</td><td className="text-right mono" style={{ color: t.pnl >= 0 ? "var(--grn)" : "var(--red)" }}>{usd(t.pnl)}</td></tr>)}
          </tbody></table></div>
          {preview.length > 8 && <div className="text-[.74rem] text-t3 mt-2">…and {preview.length - 8} more.</div>}
        </div>
      )}

      <details className="card p-4">
        <summary className="cursor-pointer text-[.9rem] font-semibold text-t1">How do I get my trades in? (TopStep &amp; Tradovate) →</summary>
        <div className="mt-3 grid sm:grid-cols-2 gap-4 text-[.84rem] text-t2 leading-relaxed">
          <div>
            <div className="font-semibold text-t1 mb-1">TopStep (TopstepX)</div>
            <div><b>Fastest:</b> Broker Link → TopStep → paste your TopstepX username + API key (Settings → API → Link Account) → Sync my account.</div>
            <div className="mt-1.5"><b>Or CSV:</b> TopstepX → <b>Trades</b> tab → <b>Export</b> (bottom-right) → pick dates → save .csv → Upload CSV here.</div>
          </div>
          <div>
            <div className="font-semibold text-t1 mb-1">Tradovate (Apex, Tradeify, TPT…)</div>
            <div><b>Live feed:</b> Broker Link → Tradovate → username + password → Connect.</div>
            <div className="mt-1.5"><b>Full history:</b> Tradovate → <b>Reports → Orders</b> tab → Download Report → <b>CSV</b> → Upload CSV here.</div>
          </div>
        </div>
        <a href="/how-to" target="_blank" rel="noreferrer" className="inline-block mt-3 text-[.82rem] font-semibold" style={{ color: "var(--acc)" }}>Full step-by-step guide →</a>
      </details>

      {score ? <ScoreReport r={score} name={profile.name} /> : (
        <div className="card p-8 text-center text-t3">Upload your trade history (or use a sample) to compute your Trader Score and unlock Insights + the Daily Brief. <a href="/how-to" target="_blank" rel="noreferrer" style={{ color: "var(--acc)" }}>See how →</a></div>
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
