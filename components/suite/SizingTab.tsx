"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { INSTRUMENTS } from "../../lib/firms";
import { kellySizing } from "../../lib/sizing";
import { usd, pct } from "../../lib/format";
import { SuiteHeader, Panel, Ring, StatTile } from "./ui";
import { Icon } from "../Icon";
const INSTR = Object.keys(INSTRUMENTS);

export function SizingTab({ profile }: { profile: Profile }) {
  const [sel, setSel] = useState(profile.accounts[0]?.id || "");
  const [instrument, setInstrument] = useState(profile.settings.instrument);
  const [stop, setStop] = useState(profile.settings.defaultStop);
  if (!profile.accounts.length) return <div className="card p-8 text-center text-t3">Add an account in Settings to compute optimal sizing.</div>;
  const account = profile.accounts.find((a) => a.id === sel) || profile.accounts[0];
  const k = kellySizing(profile.trades, account, instrument, stop);

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Optimal sizing" title="Kelly-optimal position size" sub="The mathematically optimal size from your real edge — bankrolled by your breach room, not your balance, and de-risked to survive variance." />
      {!k.ready ? <div className="card"><div className="p-8 text-center text-t3">Add ~15+ trades so the engine can measure your edge.</div></div> : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <label><span className="lbl">Account</span><select className="inp" value={account.id} onChange={(e) => setSel(e.target.value)}>{profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
            <label><span className="lbl">Instrument</span><select className="inp" value={instrument} onChange={(e) => setInstrument(e.target.value)}>{INSTR.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label><span className="lbl">Stop ({INSTRUMENTS[instrument]?.stopUnit})</span><input type="number" className="inp" value={stop} onChange={(e) => setStop(Math.max(1, +e.target.value))} /></label>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatTile icon={<Icon name="check" size={15} />} label="Win rate" value={pct(k.winRate)} />
            <StatTile icon={<Icon name="up" size={15} />} label="Payoff (avg win ÷ loss)" value={k.payoff.toFixed(2) + "x"} />
            <StatTile icon={<Icon name="calc" size={15} />} label="Expectancy / trade" value={usd(k.expectancy)} accent={k.expectancy >= 0 ? "var(--grn)" : "var(--red)"} />
          </div>
          <div className="card p-6">
            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
              <div className="flex items-center gap-5">
                <Ring pct={Math.max(0, Math.min(1, k.halfKelly))} color={k.edgePositive ? "var(--acc)" : "var(--red)"} size={118} stroke={10}>
                  <div className="text-center"><div className="mono text-[1.5rem] font-bold leading-none" style={{ color: k.edgePositive ? "var(--acc)" : "var(--red)" }}>{k.recommendContracts}</div><div className="text-[.58rem] text-t3 mt-0.5">contracts</div></div>
                </Ring>
                <div>
                  <div className="lbl mb-1">Recommended size</div>
                  <div className="mono text-lg font-bold">{usd(k.recommendRiskUsd)}<span className="text-t3 text-[.7rem] font-normal"> /trade</span></div>
                  <div className="text-[.7rem] text-t3 mt-0.5">{instrument} @ {stop}-pt stop</div>
                </div>
              </div>
              <div>
                <p className="text-[.95rem] text-t1 leading-relaxed">{k.verdict}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="chip">Full Kelly {pct(k.fullKelly)}</span>
                  <span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 30%, transparent)" }}>Half Kelly {pct(k.halfKelly)} · recommended</span>
                  <span className="chip">Quarter Kelly {pct(k.quarterKelly)}</span>
                  <span className="chip">breach room {usd(k.riskCapital)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <p className="text-[.7rem] text-t3">Kelly maximizes long-run growth but assumes a stable edge; on a funded account, half/quarter Kelly trades a little growth for a much higher chance of keeping the account.</p>
    </div>
  );
}
