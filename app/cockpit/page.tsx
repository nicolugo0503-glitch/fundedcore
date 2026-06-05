"use client";
import { useMemo, useState } from "react";
import { Nav, Footer } from "../../components/Nav";
import { FIRMS, INSTRUMENTS } from "../../lib/firms";
import { assessAccount, maxSizeNow, guardrail, demoAccounts, STATUS_META, type Account } from "../../lib/risk";
import { usd } from "../../lib/format";

let _id = 100;
const nid = () => "u" + _id++;

export default function Cockpit() {
  const [accounts, setAccounts] = useState<Account[]>(demoAccounts());
  const [selId, setSelId] = useState<string>(accounts[0]?.id || "");
  const [showAdd, setShowAdd] = useState(false);

  const selected = accounts.find((a) => a.id === selId) || accounts[0];

  const summary = useMemo(() => {
    const risks = accounts.map(assessAccount);
    const danger = risks.filter((r) => r.status === "danger" || r.status === "breached").length;
    const minDTB = risks.length ? Math.min(...risks.map((r) => r.distanceToBreach)) : 0;
    const netPnL = risks.reduce((s, r) => s + r.netPnL, 0);
    return { danger, minDTB, netPnL, count: accounts.length };
  }, [accounts]);

  function addAccount(a: Account) {
    setAccounts((xs) => [...xs, a]);
    setSelId(a.id);
    setShowAdd(false);
  }
  function removeAccount(id: string) {
    setAccounts((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="eyebrow">Risk Cockpit</div>
            <h1 className="text-3xl font-bold mt-1">Every funded account. One screen.</h1>
            <p className="text-t2 text-sm mt-1.5 max-w-xl">
              Live <span className="text-t1">Distance to Breach</span> across every firm, and a pre-trade
              guardrail that tells you the largest size you can take right now without blowing up.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary !py-2.5 !px-4 text-sm whitespace-nowrap">+ Add account</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Sum label="Accounts tracked" value={String(summary.count)} />
          <Sum label="Net P&L (all)" value={usd(summary.netPnL)} color={summary.netPnL >= 0 ? "#10B981" : "#EF4444"} />
          <Sum label="Tightest account" value={usd(summary.minDTB)} sub="closest to breach" color={summary.minDTB < 500 ? "#EF4444" : "#F0F4FF"} />
          <Sum label="In danger" value={String(summary.danger)} color={summary.danger ? "#EF4444" : "#10B981"} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {accounts.map((a) => (
            <AccountCard key={a.id} a={a} selected={a.id === selId}
              onSelect={() => setSelId(a.id)} onRemove={() => removeAccount(a.id)} />
          ))}
        </div>

        {selected && <Guardrail account={selected} accounts={accounts} onPick={setSelId} />}
      </main>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addAccount} />}
      <Footer />
    </>
  );
}

function Sum({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[.7rem] uppercase tracking-wide text-t3">{label}</div>
      <div className="text-xl font-bold mono mt-1" style={{ color: color || "#F0F4FF" }}>{value}</div>
      {sub && <div className="text-[.7rem] text-t3">{sub}</div>}
    </div>
  );
}

function AccountCard({ a, selected, onSelect, onRemove }: { a: Account; selected: boolean; onSelect: () => void; onRemove: () => void }) {
  const r = assessAccount(a);
  const sm = STATUS_META[r.status];
  const buf = Math.max(0, Math.min(1, r.pctBuffer));
  return (
    <div onClick={onSelect}
      className={`card p-5 cursor-pointer transition ${selected ? "ring-1 ring-acc/60" : "card-hover"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{a.label}</div>
          <div className="text-[.78rem] text-t3">{r.firm.name}</div>
        </div>
        <span className="chip" style={{ borderColor: sm.color + "66", color: sm.color }}>● {sm.label}</span>
      </div>

      <div className="mt-4">
        <div className="text-[.7rem] uppercase tracking-wide text-t3">Distance to breach</div>
        <div className="text-3xl font-bold mono" style={{ color: sm.color }}>{usd(Math.max(0, r.distanceToBreach))}</div>
        <div className="text-[.72rem] text-t3 mt-0.5">
          binding: {r.bindingConstraint === "daily" ? "daily loss limit" : "trailing drawdown"} · {r.firm.drawdownType.replace("_", " ")}
        </div>
        <div className="h-2 w-full rounded-full bg-white/[.06] overflow-hidden mt-2">
          <div className="h-full rounded-full" style={{ width: `${buf * 100}%`, background: sm.color, boxShadow: `0 0 8px ${sm.color}` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <Mini label="Balance" value={usd(a.balance)} />
        <Mini label="Net P&L" value={usd(r.netPnL)} color={r.netPnL >= 0 ? "#10B981" : "#EF4444"} />
        <Mini label="Daily room" value={r.dailyRoom === Infinity ? "—" : usd(r.dailyRoom)} />
      </div>

      {r.firm.profitTarget > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[.7rem] text-t3"><span>to pass</span><span>{usd(r.toProfitTarget)} left</span></div>
          <div className="h-1.5 w-full rounded-full bg-white/[.06] overflow-hidden mt-1">
            <div className="h-full rounded-full bg-acc" style={{ width: `${r.targetPct * 100}%` }} />
          </div>
        </div>
      )}

      <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="mt-3 text-[.72rem] text-t3 hover:text-red transition">remove</button>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[.03] py-1.5">
      <div className="text-[.62rem] uppercase text-t3">{label}</div>
      <div className="mono text-[.82rem] font-semibold" style={{ color: color || "#F0F4FF" }}>{value}</div>
    </div>
  );
}

const INSTR_KEYS = Object.keys(INSTRUMENTS);

function Guardrail({ account, accounts, onPick }: { account: Account; accounts: Account[]; onPick: (id: string) => void }) {
  const [instrument, setInstrument] = useState("MNQ");
  const [stop, setStop] = useState(20);
  const [size, setSize] = useState(2);

  const res = guardrail(account, { instrument, size, stop });
  const maxNow = maxSizeNow(account, instrument, stop);
  const vcolor: Record<string, string> = { APPROVE: "#10B981", REDUCE: "#F59E0B", WAIT: "#F59E0B", BLOCK: "#EF4444" };
  const vc = vcolor[res.verdict];

  return (
    <section className="card p-6">
      <div className="eyebrow">Pre-trade guardrail</div>
      <h2 className="text-xl font-bold mt-1 mb-4">Can I take this trade?</h2>

      <div className="grid md:grid-cols-4 gap-3 mb-5">
        <Field label="Account">
          <select value={account.id} onChange={(e) => onPick(e.target.value)} className="inp">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Instrument">
          <select value={instrument} onChange={(e) => setInstrument(e.target.value)} className="inp">
            {INSTR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label={`Stop (${INSTRUMENTS[instrument]?.stopUnit || "pts"})`}>
          <input type="number" min={1} value={stop} onChange={(e) => setStop(Math.max(1, +e.target.value))} className="inp" />
        </Field>
        <Field label="Size (contracts)">
          <input type="number" min={1} value={size} onChange={(e) => setSize(Math.max(1, +e.target.value))} className="inp" />
        </Field>
      </div>

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-5">
        <div className="rounded-xl p-5" style={{ background: vc + "12", border: `1px solid ${vc}44` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold" style={{ color: vc }}>{res.verdict}</span>
            <span className="chip" style={{ borderColor: vc + "55", color: vc }}>max safe size: {res.safeSize}</span>
          </div>
          <p className="text-sm text-t2 mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: res.reason }} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Stat label="Worst-case loss" value={usd(res.worstCase)} color="#EF4444" />
            <Stat label="Max size right now" value={String(maxNow)} color={vc} />
          </div>
        </div>

        <div>
          <div className="text-[.72rem] uppercase tracking-wide text-t3 mb-2">Rule checks</div>
          <div className="space-y-1.5">
            {res.checks.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[.82rem] rounded-lg px-3 py-1.5 bg-white/[.025]">
                <span className="text-t2">{c.l.replace(/_/g, " ")}</span>
                <span className="mono" style={{ color: c.s === "ok" ? "#10B981" : c.s === "warn" ? "#F59E0B" : "#EF4444" }}
                  dangerouslySetInnerHTML={{ __html: c.v }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[.7rem] text-t3 mt-4">Rule snapshots are illustrative — always confirm specifics with your firm.</p>
      <style>{`.inp{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:.5rem .7rem;color:#F0F4FF;font-size:.9rem}.inp:focus{outline:none;border-color:rgba(59,130,246,.6)}`}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[.7rem] uppercase tracking-wide text-t3 mb-1">{label}</div>
      {children}
    </label>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[.03] px-3 py-2">
      <div className="text-[.66rem] uppercase text-t3">{label}</div>
      <div className="mono text-lg font-semibold" style={{ color: color || "#F0F4FF" }}>{value}</div>
    </div>
  );
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: Account) => void }) {
  const firmKeys = Object.keys(FIRMS);
  const [firmKey, setFirmKey] = useState(firmKeys[0]);
  const [label, setLabel] = useState("");
  const firm = FIRMS[firmKey];
  const [balance, setBalance] = useState(firm.start);
  const [todayPnL, setTodayPnL] = useState(0);

  function pickFirm(k: string) {
    setFirmKey(k);
    setBalance(FIRMS[k].start);
  }
  function submit() {
    const bal = balance;
    onAdd({
      id: nid(), label: label || firm.firmBrand + " account", firmKey,
      startBalance: firm.start, balance: bal, peakEquity: Math.max(bal, firm.start),
      todayPnL, daysTraded: 0,
    });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Add a funded account</h3>
        <div className="space-y-3">
          <Field label="Firm / account type">
            <select value={firmKey} onChange={(e) => pickFirm(e.target.value)} className="inp">
              {firmKeys.map((k) => <option key={k} value={k}>{FIRMS[k].name}</option>)}
            </select>
          </Field>
          <Field label="Label (optional)">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Apex #2" className="inp" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current balance"><input type="number" value={balance} onChange={(e) => setBalance(+e.target.value)} className="inp" /></Field>
            <Field label="Today's P&L"><input type="number" value={todayPnL} onChange={(e) => setTodayPnL(+e.target.value)} className="inp" /></Field>
          </div>
          <div className="text-[.72rem] text-t3">
            Starts at {usd(firm.start)} · trailing DD {usd(firm.trailingDD)} ({firm.drawdownType.replace("_", " ")})
            {firm.dailyLoss ? ` · daily loss ${usd(firm.dailyLoss)}` : " · no daily limit"}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={submit} className="btn btn-primary flex-1">Add account</button>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
        <style>{`.inp{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:.5rem .7rem;color:#F0F4FF;font-size:.9rem}.inp:focus{outline:none;border-color:rgba(59,130,246,.6)}`}</style>
      </div>
    </div>
  );
}
