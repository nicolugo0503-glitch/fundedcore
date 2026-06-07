"use client";
import { useState, useRef } from "react";
import { Logo } from "../Nav";
import { FIRMS } from "../../lib/firms";
import { type Account } from "../../lib/risk";
import { type Profile, demoProfile } from "../../lib/profile";
import { parseTradesCsv } from "../../lib/csv";
import { sampleById } from "../../lib/sampleTraders";
import { usd } from "../../lib/format";

let _id = 1;
const nid = () => "acc" + _id++ + Date.now().toString(36);

export function Onboarding({ onDone, initial }: { onDone: (p: Profile) => void; initial: Profile }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const firmKeys = Object.keys(FIRMS);
  const [firmKey, setFirmKey] = useState(firmKeys[0]);
  const [balance, setBalance] = useState(FIRMS[firmKeys[0]].start);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState(initial.trades);
  const fileRef = useRef<HTMLInputElement>(null);
  const firm = FIRMS[firmKey];

  function addAccount() {
    setAccounts((xs) => [...xs, {
      id: nid(), label: firm.firmBrand + " #" + (xs.length + 1), firmKey,
      startBalance: firm.start, balance, peakEquity: Math.max(balance, firm.start), todayPnL: 0, daysTraded: 0,
    }]);
  }
  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => { const res = parseTradesCsv(String(r.result || "")); if (res.trades.length) setTrades(res.trades); };
    r.readAsText(f);
  }
  function useSample() {
    const s = sampleById("maya")!;
    setTrades(s.trades);
    if (!name) setName("Maya");
  }
  function finish() {
    onDone({
      ...initial,
      name: name || "Trader",
      accounts: accounts.length ? accounts : [{
        id: nid(), label: firm.firmBrand + " #1", firmKey, startBalance: firm.start,
        balance, peakEquity: Math.max(balance, firm.start), todayPnL: 0, daysTraded: 0,
      }],
      trades,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card p-7 max-w-lg w-full fade">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <span className="text-xs text-t3">Step {step + 1} of 3</span>
        </div>

        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold mb-1">Welcome to your trading suite.</h1>
            <p className="text-t2 text-sm mb-5">Everything a funded trader needs, personalized to you. Two minutes to set up.</p>
            <label className="lbl">What should we call you?</label>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or handle" />
            <button className="btn btn-primary w-full mt-5" onClick={() => setStep(1)}>Continue →</button>
            <button className="btn btn-ghost w-full mt-2 text-sm" onClick={() => onDone(demoProfile({ ...initial, name: name || "Maya" }))}>Skip — explore with demo data</button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-1">Add your funded account(s).</h2>
            <p className="text-t2 text-sm mb-4">We'll track each one's exact rules and breach distance.</p>
            <label className="lbl">Firm / account type</label>
            <select className="inp" value={firmKey} onChange={(e) => { setFirmKey(e.target.value); setBalance(FIRMS[e.target.value].start); }}>
              {firmKeys.map((k) => <option key={k} value={k}>{FIRMS[k].name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="lbl">Current balance</label><input type="number" className="inp" value={balance} onChange={(e) => setBalance(+e.target.value)} /></div>
              <div className="flex items-end"><button className="btn btn-ghost w-full" onClick={addAccount}>+ Add account</button></div>
            </div>
            {accounts.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {accounts.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm rounded-lg bg-black/[.03] px-3 py-2">
                    <span>{a.label} · {FIRMS[a.firmKey].name}</span><span className="mono text-t2">{usd(a.balance)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary flex-1" onClick={() => setStep(2)}>Continue →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-1">Add your trade history.</h2>
            <p className="text-t2 text-sm mb-4">This powers your Insights, Score, and personalized brief. You can skip and add it later.</p>
            <div className="card p-5 text-center border-dashed cursor-pointer card-hover mb-3" onClick={() => fileRef.current?.click()}>
              <div className="text-2xl mb-1">↑</div>
              <div className="text-sm font-medium">Upload trade-history CSV</div>
              <div className="text-[.78rem] text-t3">processed in your browser</div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </div>
            <button className="btn btn-ghost w-full text-sm" onClick={useSample}>Use a sample trader instead</button>
            {trades.length > 0 && <p className="text-grn text-sm mt-3 text-center">✓ {trades.length} trades loaded</p>}
            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary flex-1" onClick={finish}>Enter the suite →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
