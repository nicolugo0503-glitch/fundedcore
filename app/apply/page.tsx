"use client";
import { useState, useRef } from "react";
import { Nav, Footer } from "../../components/Nav";
import { ScoreReport } from "../../components/ScoreReport";
import { scoreTrades, type ScoreResult, type Trade } from "../../lib/score";
import { parseTradesCsv, CSV_TEMPLATE } from "../../lib/csv";
import { SAMPLE_TRADERS, type SampleTrader } from "../../lib/sampleTraders";
import { DECISION_META } from "../../lib/format";

type Phase = "input" | "scoring" | "result";

export default function ApplyPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [name, setName] = useState<string>("");
  const [tab, setTab] = useState<"sample" | "upload">("sample");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  function runScore(trades: Trade[], who: string, warns: string[] = []) {
    if (trades.length < 5) {
      setError("That history has too few trades to score. We need at least ~5 closed trades (ideally 30+).");
      return;
    }
    setError("");
    setWarnings(warns);
    setName(who);
    setPhase("scoring");
    setTimeout(() => {
      setResult(scoreTrades(trades));
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1500);
  }

  function pickSample(s: SampleTrader) {
    runScore(s.trades, `${s.name} · ${s.tag}`);
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const res = parseTradesCsv(String(reader.result || ""));
      if (!res.trades.length) {
        setError(res.warnings[0] || "Couldn't read any trades from that file.");
        return;
      }
      runScore(res.trades, file.name.replace(/\.csv$/i, ""), res.warnings);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fundedcore-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setPhase("input"); setResult(null); setError(""); setWarnings([]);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-5 py-12">
        {phase !== "result" && (
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="eyebrow">Free underwriting</div>
            <h1 className="text-3xl md:text-[2.6rem] font-bold mt-2 leading-tight">
              Get your <span className="grad-text">Trader Score</span>.
            </h1>
            <p className="text-t2 mt-4">
              Upload a trade history or try a sample trader. The engine returns a full edge assessment
              and a funding decision in seconds. No card. No challenge.
            </p>
          </div>
        )}

        {phase === "input" && (
          <div className="fade">
            <div className="flex justify-center gap-2 mb-6">
              <TabBtn on={tab === "sample"} onClick={() => setTab("sample")}>Try a sample trader</TabBtn>
              <TabBtn on={tab === "upload"} onClick={() => setTab("upload")}>Upload my history</TabBtn>
            </div>

            {tab === "sample" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {SAMPLE_TRADERS.map((s) => {
                  const dm = DECISION_META[s.expected];
                  return (
                    <button key={s.id} onClick={() => pickSample(s)}
                      className="card card-hover p-5 text-left group">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{s.name}</h3>
                          <div className="text-[.8rem] text-acc">{s.tag}</div>
                        </div>
                        <span className="chip" style={{ borderColor: dm.color + "55", color: dm.color }}>
                          likely {dm.label.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-[.85rem] text-t2 mt-3 leading-relaxed">{s.blurb}</p>
                      <div className="mt-4 text-[.8rem] text-acc font-medium opacity-0 group-hover:opacity-100 transition">
                        Score this trader →
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "upload" && (
              <div className="max-w-xl mx-auto">
                <div
                  className="card p-8 text-center border-dashed cursor-pointer card-hover"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
                >
                  <div className="text-3xl mb-2">↑</div>
                  <div className="font-semibold">Drop your trade-history CSV here</div>
                  <div className="text-[.82rem] text-t2 mt-1">or click to browse · processed in your browser, never uploaded</div>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
                </div>
                <div className="mt-4 card p-5 text-[.82rem] text-t2">
                  <div className="font-semibold text-t1 mb-1.5">Format</div>
                  <p>Any broker/journal export works. We just need a profit/loss column — dates and
                    position sizes make the score sharper. We auto-detect columns like
                    <span className="mono text-t1"> pnl, net, profit, date, size, symbol, side</span>.</p>
                  <button onClick={downloadTemplate} className="btn btn-ghost !py-2 !px-3 text-[.8rem] mt-3">
                    ↓ Download CSV template
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-center text-red text-sm mt-5">{error}</p>}
          </div>
        )}

        {phase === "scoring" && <Scoring name={name} />}

        {phase === "result" && result && (
          <div className="fade">
            <div className="flex items-center justify-between mb-5">
              <button onClick={reset} className="btn btn-ghost !py-2 !px-4 text-sm">← Score another</button>
              <div className="text-xs text-t3">Underwriting model · illustrative</div>
            </div>
            {warnings.length > 0 && (
              <div className="card p-4 mb-5 text-[.82rem] text-t2" style={{ borderColor: "rgba(245,158,11,.3)" }}>
                <span className="text-amb font-semibold">Notes on your file: </span>
                {warnings.join(" ")}
              </div>
            )}
            <ScoreReport r={result} name={name} />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${on ? "bg-acc/15 border-acc/40 text-t1" : "border-black/10 text-t2 hover:text-t1"}`}>
      {children}
    </button>
  );
}

function Scoring({ name }: { name: string }) {
  const steps = [
    "Parsing trade history",
    "Reconstructing equity curve",
    "Measuring edge significance (t-stat)",
    "Profiling behavior & discipline",
    "Stress-testing drawdown control",
    "Pricing capital allocation",
  ];
  return (
    <div className="max-w-md mx-auto py-16 text-center fade">
      <div className="mono text-acc text-sm mb-2">UNDERWRITING</div>
      <h2 className="text-xl font-bold mb-1">Scoring {name.split("·")[0].trim()}…</h2>
      <p className="text-t3 text-sm mb-8">Running the actuarial model</p>
      <div className="space-y-2 text-left">
        {steps.map((s, i) => (
          <div key={s} className="card px-4 py-2.5 flex items-center gap-3 fade" style={{ animationDelay: `${i * 0.18}s` }}>
            <span className="w-2 h-2 rounded-full bg-acc pulse" />
            <span className="text-[.86rem] text-t2">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
