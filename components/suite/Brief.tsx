"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile, demoProfile } from "../../lib/profile";
import { assessAccount, STATUS_META, maxSizeNow } from "../../lib/risk";
import { analyze } from "../../lib/insights";
import { scoreTrades } from "../../lib/score";
import { usd, pct, scoreColor } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { ClearanceCard, EdgeClock } from "./Decision";
import { KeyLevels, type Levels } from "./Levels";
import { rootSymbol } from "../../lib/market";
import { Icon } from "../Icon";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Mkt = { key: string; label: string; last: number; chg: number; spark: number[] };
type Head = { title: string; link: string; source: string; date: string; image: string | null; summary: string };

function ago(d: string) {
  const t = +new Date(d); if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now"; if (m < 60) return m + "m ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  if (!pts || pts.length < 2) return null;
  const w = 100, h = 28, min = Math.min(...pts), max = Math.max(...pts), rng = max - min || 1;
  const d = pts.map((p, i) => (i / (pts.length - 1)) * w + "," + (h - ((p - min) / rng) * (h - 3) - 1.5)).join(" ");
  const col = up ? "var(--grn)" : "var(--red)";
  const id = "g" + Math.abs(pts[0] | 0) + pts.length;
  return (
    <svg viewBox={"0 0 " + w + " " + h} preserveAspectRatio="none" className="w-full" style={{ height: 28 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.25" /><stop offset="100%" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      <polygon points={"0," + h + " " + d + " " + w + "," + h} fill={"url(#" + id + ")"} />
      <polyline points={d} fill="none" stroke={col} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function NewsImg({ src, className }: { src: string | null; className: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return <div className={className + " flex items-center justify-center"} style={{ background: "var(--panel2)" }}><Icon name="news" size={22} className="text-t3" /></div>;
  return <img src={src} alt="" className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)} />;
}

export function Brief({ profile, go, setProfile }: { profile: Profile; go: (t: string) => void; setProfile?: (p: Profile) => void }) {
  const [events, setEvents] = useState<any[] | null>(null);
  const [heads, setHeads] = useState<Head[] | null>(null);
  const [mkt, setMkt] = useState<Mkt[] | null>(null);
  const [levels, setLevels] = useState<Levels | null>(null);
  const [brief, setBrief] = useState<{ text: string; source: string } | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [tradeRead, setTradeRead] = useState<{ text: string; source: string } | null>(null);
  const [tradeLoading, setTradeLoading] = useState(true);
  const briefDone = useRef(false);

  useEffect(() => { fetch("/api/news").then((r) => r.json()).then((d) => setEvents(d.events || [])).catch(() => setEvents([])); }, []);
  useEffect(() => { fetch("/api/headlines?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((d) => setHeads(d.items || [])).catch(() => setHeads([])); }, []);
  useEffect(() => {
    const wl = [["SPX", "S&P 500"], ["NDX", "Nasdaq"], ["VIX", "VIX"], ["GOLD", "Gold"], ["WTI", "Crude"], ["BTC", "Bitcoin"], ["US10Y", "10Y"], ["DXY", "Dollar"]];
    Promise.all(wl.map(async ([k, label]) => {
      try {
        const d = await fetch("/api/market?symbol=" + k + "&interval=1h&range=5d").then((r) => r.json());
        const cs = d.candles || []; if (!cs.length) return null;
        return { key: k, label, last: cs[cs.length - 1].c, chg: (cs[cs.length - 1].c - cs[0].o) / cs[0].o, spark: cs.map((c: any) => c.c) };
      } catch { return null; }
    })).then((r) => setMkt(r.filter(Boolean) as Mkt[]));
  }, []);
  useEffect(() => {
    const root = rootSymbol(profile.settings.instrument) || "NQ";
    fetch("/api/market?symbol=" + root + "&interval=1d&range=2mo").then((r) => r.json()).then((d) => {
      const cs: any[] = d.candles || [];
      if (cs.length < 16) { setLevels(null); return; }
      const today = cs[cs.length - 1], prior = cs[cs.length - 2];
      let trSum = 0; for (let i = cs.length - 14; i < cs.length; i++) { const c = cs[i], p = cs[i - 1]; trSum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)); }
      const atr = trSum / 14;
      setLevels({ root, cur: today.c, open: today.o, PDH: prior.h, PDL: prior.l, PDC: prior.c, dayH: today.h, dayL: today.l, gap: today.o - prior.c, atr });
    }).catch(() => setLevels(null));
  }, [profile.settings.instrument]);

  const now = new Date();
  const todayDow = now.getUTCDay();
  const risks = profile.accounts.map(assessAccount);
  const tightest = risks.length ? risks.reduce((a, b) => (b.distanceToBreach < a.distanceToBreach ? b : a)) : null;
  const ins = profile.trades.length >= 5 ? analyze(profile.trades) : null;
  const score = profile.trades.length >= 5 ? scoreTrades(profile.trades) : null;

  const upcoming = (events || []).filter((e) => { const t = new Date(e.date).getTime(); return t > now.getTime() - 3600000 && t < now.getTime() + 4 * 86400000; }).slice(0, 6);
  const dayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][todayDow];
  const dayBucket = ins?.byDay.find((b) => b.key === dayKey);
  const topLeak = ins?.leaks[0];

  // ── Decision layer ──
  function dailyStreak(): { dir: number; len: number } {
    const byDate = new Map<string, number>();
    for (const t of profile.trades) { const d = new Date(t.timestamp).toISOString().slice(0, 10); byDate.set(d, (byDate.get(d) || 0) + t.pnl); }
    const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    if (!days.length) return { dir: 0, len: 0 };
    const sign = days[0][1] >= 0 ? 1 : -1; let len = 0;
    for (const [, net] of days) { if ((net >= 0 ? 1 : -1) === sign) len++; else break; }
    return { dir: sign, len };
  }
  // tightest actual account object
  let tightAcct: typeof profile.accounts[number] | null = null;
  if (profile.accounts.length) { let bi = 0; risks.forEach((r, i) => { if (r.distanceToBreach < risks[bi].distanceToBreach) bi = i; }); tightAcct = profile.accounts[bi]; }

  const reasons: { tone: "red" | "amber" | "green"; text: string }[] = [];
  if (tightest) {
    if (tightest.status === "breached" || tightest.status === "danger") reasons.push({ tone: "red", text: `Only ${usd(Math.max(0, tightest.distanceToBreach))} to breach on ${tightest.firm.firmBrand}` });
    else if (tightest.status === "caution") reasons.push({ tone: "amber", text: `Buffer thin — ${Math.round(tightest.pctBuffer * 100)}% left on ${tightest.firm.firmBrand}` });
    else reasons.push({ tone: "green", text: `Accounts healthy (${risks.filter(r => r.status === "healthy").length}/${risks.length})` });
  } else reasons.push({ tone: "amber", text: "No funded account connected yet" });
  const streak = dailyStreak();
  if (streak.dir < 0 && streak.len >= 3) reasons.push({ tone: "red", text: `${streak.len}-day losing streak — step back` });
  else if (streak.dir < 0 && streak.len === 2) reasons.push({ tone: "amber", text: "2 red days in a row — size down" });
  else if (streak.dir > 0 && streak.len >= 2) reasons.push({ tone: "green", text: `${streak.len}-day green streak — protect it` });
  if (dayBucket && dayBucket.trades >= 4) {
    if (dayBucket.net < 0) reasons.push({ tone: "amber", text: `${DOW[todayDow]} is historically weak for you (${pct(dayBucket.winRate)})` });
    else reasons.push({ tone: "green", text: `${DOW[todayDow]} tends to be green for you (${pct(dayBucket.winRate)})` });
  }
  const newsSoon = (upcoming || []).find((e) => { const m = (+new Date(e.date) - now.getTime()) / 60000; return m >= 0 && m < 60; });
  if (newsSoon) reasons.push({ tone: "amber", text: `${newsSoon.title} within the hour — wait it out` });

  const reds = reasons.filter(r => r.tone === "red").length;
  const ambers = reasons.filter(r => r.tone === "amber").length;
  const verdict: "GO" | "CAUTION" | "STAND DOWN" = reds > 0 ? "STAND DOWN" : ambers > 0 ? "CAUTION" : "GO";

  let budget: { dollars: number; perTrade: number; contracts: number; instrument: string; stop: number } | null = null;
  if (tightAcct && tightest) {
    const dollars = Math.max(0, Math.min(profile.settings.dailyLossStop, Math.round(tightest.distanceToBreach * 0.25)));
    const stop = profile.settings.defaultStop;
    const contracts = maxSizeNow(tightAcct, profile.settings.instrument, stop);
    budget = { dollars, perTrade: dollars / 3, contracts, instrument: profile.settings.instrument, stop };
  }

  const clockBuckets = (ins?.byHour || []).filter((b) => b.trades >= 2).map((b) => ({ key: b.key, net: b.net, trades: b.trades, winRate: b.winRate }));
  const nowKey = String(now.getUTCHours()).padStart(2, "0") + ":00";

  // Your number today — typical green day + walk-away
  let dayTarget: number | null = null;
  if (profile.trades.length >= 8) {
    const byDate = new Map<string, number>();
    for (const t of profile.trades) { const d = new Date(t.timestamp).toISOString().slice(0, 10); byDate.set(d, (byDate.get(d) || 0) + t.pnl); }
    const greens = [...byDate.values()].filter((n) => n > 0).sort((a, b) => a - b);
    if (greens.length >= 3) { const med = greens[Math.floor(greens.length / 2)]; dayTarget = Math.round(med / 10) * 10; }
  }

  const spx = mkt?.find((m) => m.key === "SPX");
  const ndx = mkt?.find((m) => m.key === "NDX");
  const vix = mkt?.find((m) => m.key === "VIX");
  const tone = spx ? (spx.chg < -0.007 ? "risk-off" : spx.chg > 0.007 ? "risk-on" : "flat") : null;

  function loadBrief() {
    setBriefLoading(true);
    const ctx = {
      name: profile.name, dow: DOW[todayDow], tone: tone || undefined,
      spxPct: spx?.chg, ndxPct: ndx?.chg, vix: vix?.last,
      headlines: (heads || []).slice(0, 4).map((h) => h.title),
      tightest: tightest ? { firm: tightest.firm.firmBrand, dtb: Math.max(0, tightest.distanceToBreach), pctBuffer: tightest.pctBuffer, status: tightest.status } : null,
      score: score ? { value: score.traderScore, grade: score.grade, decision: score.decision } : null,
      topLeak: topLeak ? { title: topLeak.title, cost: topLeak.cost } : null,
      dayWinRate: dayBucket && dayBucket.trades >= 4 ? dayBucket.winRate : null,
      maxTrades: profile.settings.maxTradesPerDay, dailyStop: profile.settings.dailyLossStop,
    };
    const headers: any = { "content-type": "application/json" };
    if (profile.settings.anthropicKey) headers["x-anthropic-key"] = profile.settings.anthropicKey;
    fetch("/api/brief", { method: "POST", headers, body: JSON.stringify({ context: ctx }) })
      .then((r) => r.json()).then((d) => setBrief({ text: d.text, source: d.source })).catch(() => setBrief(null)).finally(() => setBriefLoading(false));
  }
  function loadTradeRead() {
    setTradeLoading(true);
    const movers = (mkt || []).filter((m) => m.key !== "VIX");
    const mover = movers.length ? movers.reduce((a, b) => (Math.abs(b.chg) > Math.abs(a.chg) ? b : a)) : null;
    const ev = upcoming[0] ? { title: upcoming[0].title, time: new Date(upcoming[0].date).toUTCString().slice(17, 22) } : null;
    const ctx = {
      tone: tone || undefined, spxPct: spx?.chg, ndxPct: ndx?.chg, vix: vix?.last,
      mover: mover ? { label: mover.label, chg: mover.chg } : null,
      headlines: (heads || []).slice(0, 5).map((h) => h.title),
      event: ev, instrument: profile.settings.instrument,
    };
    const headers: any = { "content-type": "application/json" };
    if (profile.settings.anthropicKey) headers["x-anthropic-key"] = profile.settings.anthropicKey;
    fetch("/api/tradeplan", { method: "POST", headers, body: JSON.stringify({ context: ctx }) })
      .then((r) => r.json()).then((d) => setTradeRead({ text: d.text, source: d.source })).catch(() => setTradeRead(null)).finally(() => setTradeLoading(false));
  }
  useEffect(() => {
    if (briefDone.current) return;
    if (mkt !== null && heads !== null) { briefDone.current = true; loadBrief(); loadTradeRead(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mkt, heads]);

  const tm = tightest ? STATUS_META[tightest.status] : null;
  const greeting = now.getUTCHours() < 11 ? "Good morning" : now.getUTCHours() < 17 ? "Good afternoon" : "Good evening";
  const topHeads = (heads || []).filter((h) => h.image).slice(0, 5);
  const restHeads = (heads || []).filter((h) => !topHeads.includes(h)).slice(0, 5);

  function buildPlan(): string[] {
    const p: string[] = [];
    if (tightest) p.push("Tightest account (" + tightest.firm.firmBrand + ") has " + usd(Math.max(0, tightest.distanceToBreach)) + " before breach — your hard ceiling on risk today.");
    if (spx && tone) p.push("Tape check: S&P " + (spx.chg >= 0 ? "+" : "") + (spx.chg * 100).toFixed(1) + "% recently — " + (tone === "risk-off" ? "risk-off, trade lighter" : tone === "risk-on" ? "risk-on" : "flat, no edge from the tape") + ".");
    if (upcoming.length) { const e = upcoming[0]; p.push(e.title + " " + new Date(e.date).toUTCString().slice(17, 22) + " UTC — no trades in the 5 minutes around it."); }
    if (dayBucket && dayBucket.trades >= 4) p.push("Your " + DOW[todayDow] + " win rate is " + pct(dayBucket.winRate) + " historically" + (dayBucket.net < 0 ? " — trade smaller today" : " — a decent day for you") + ".");
    if (topLeak) p.push("Watch your #1 leak: " + topLeak.title.toLowerCase() + ". " + topLeak.fix);
    p.push("Cap: max " + profile.settings.maxTradesPerDay + " trades, stop at " + usd(profile.settings.dailyLossStop) + " down.");
    return p;
  }

  return (
    <div className="fade space-y-4">
      <SuiteHeader eyebrow={DOW[todayDow] + " · " + now.toLocaleDateString("en-US", { month: "long", day: "numeric" }) + " · pre-market brief"}
        title={<>{greeting}, <span className="grad-text">{profile.name}</span>.</>}
        sub="Your whole trading world before the bell — markets, news, AI read, and your risk in one screen."
        right={<span className="chip"><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "var(--grn)" }} /> {risks.filter(r => r.status === "healthy").length}/{risks.length || 0} healthy</span>} />

      <ClearanceCard verdict={verdict} reasons={reasons} budget={budget} />

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="lbl mb-0">Markets right now</span>
          <div className="flex items-center gap-2">
            {tone && <span className="chip" style={{ color: tone === "risk-off" ? "var(--red)" : tone === "risk-on" ? "var(--grn)" : "var(--t2)" }}>{tone} tape</span>}
            <button onClick={() => go("markets")} className="text-acc text-xs">all markets →</button>
          </div>
        </div>
        {mkt === null ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 78 }} />)}</div>
        ) : mkt.length === 0 ? (
          <div className="text-center text-t3 text-sm py-4">Market feed unavailable right now.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {mkt.map((m) => (
              <button key={m.key} onClick={() => go("markets")} className="card card-hover p-3 text-left">
                <div className="flex items-center justify-between"><span className="text-[.66rem] text-t3 uppercase tracking-wide truncate">{m.label}</span><span className="mono text-[.7rem]" style={{ color: m.chg >= 0 ? "var(--grn)" : "var(--red)" }}>{m.chg >= 0 ? "+" : ""}{(m.chg * 100).toFixed(2)}%</span></div>
                <div className="mono text-[1.02rem] font-semibold mt-0.5">{m.last >= 1000 ? m.last.toLocaleString("en-US", { maximumFractionDigits: 0 }) : m.last.toFixed(2)}</div>
                <div className="mt-1.5"><Spark pts={m.spark} up={m.chg >= 0} /></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}><Icon name="brain" size={16} /></span>
            <div>
              <div className="font-semibold text-[.96rem] leading-tight">Your AI briefing</div>
              <div className="text-[.68rem] text-t3">{brief?.source === "claude" ? "Generated by Claude · live" : "Composed from your data"} · {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
            </div>
          </div>
          <button onClick={loadBrief} className="btn btn-ghost !py-1.5 !px-3 text-[.75rem]" disabled={briefLoading}><Icon name="repeat" size={13} /> {briefLoading ? "Thinking…" : "Refresh"}</button>
        </div>
        {briefLoading && !brief ? (
          <div className="space-y-2"><div className="skeleton" style={{ height: 13, width: "92%" }} /><div className="skeleton" style={{ height: 13, width: "97%" }} /><div className="skeleton" style={{ height: 13, width: "84%" }} /></div>
        ) : (
          <p className="text-[.95rem] text-t1 leading-relaxed">{brief?.text || "Briefing unavailable right now — tap refresh."}</p>
        )}
        {brief && brief.source !== "claude" && (
          <div className="mt-3 text-[.72rem] text-t3 flex items-center gap-1.5"><Icon name="bolt" size={12} /> Add your Anthropic key in Settings for a live, fully-reasoned daily briefing.</div>
        )}
      </div>

          <Panel title="Market news" icon={<Icon name="news" />} action={<button className="text-acc text-xs" onClick={() => go("news")}>economic calendar →</button>}>
            {heads === null ? (
              <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}</div>
            ) : topHeads.length === 0 && restHeads.length === 0 ? (
              <EmptyState icon="news" title="News feed unavailable" body="The live headline feed couldn't be reached right now. The economic calendar is still in the News tab." />
            ) : (
              <div className="space-y-4">
                {topHeads[0] && (
                  <a href={topHeads[0].link} target="_blank" rel="noopener noreferrer" className="card card-hover overflow-hidden block group">
                    <NewsImg src={topHeads[0].image} className="w-full h-60 object-cover" />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5"><span className="chip !py-0.5">{topHeads[0].source}</span><span className="text-[.72rem] text-t3">{ago(topHeads[0].date)}</span></div>
                      <div className="font-semibold text-[1.1rem] leading-snug group-hover:text-acc transition">{topHeads[0].title}</div>
                      {topHeads[0].summary && <p className="text-[.85rem] text-t2 mt-1.5 leading-relaxed line-clamp-2">{topHeads[0].summary}</p>}
                    </div>
                  </a>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {topHeads.slice(1, 5).map((h, i) => (
                    <a key={i} href={h.link} target="_blank" rel="noopener noreferrer" className="card card-hover overflow-hidden group flex flex-col">
                      <NewsImg src={h.image} className="w-full h-44 object-cover" />
                      <div className="p-3.5 flex-1">
                        <div className="flex items-center gap-2 mb-1"><span className="text-[.7rem] text-acc font-medium">{h.source}</span><span className="text-[.7rem] text-t3">{ago(h.date)}</span></div>
                        <div className="font-medium text-[.95rem] leading-snug group-hover:text-acc transition line-clamp-2">{h.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
                {restHeads.length > 0 && (
                  <div>
                    {restHeads.map((h, i) => (
                      <a key={i} href={h.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-2.5 group" style={{ borderTop: "1px solid var(--line)" }}>
                        <span className="text-[.86rem] text-t1 group-hover:text-acc transition line-clamp-1">{h.title}</span>
                        <span className="text-[.7rem] text-t3 shrink-0 whitespace-nowrap">{h.source} · {ago(h.date)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>

      <div className="card p-5 relative overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--acc) 30%, var(--line2))" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}><Icon name="target" size={16} /></span>
            <div>
              <div className="font-semibold text-[.96rem] leading-tight">Today's trade read</div>
              <div className="text-[.68rem] text-t3">{tradeRead?.source === "claude" ? "AI strategist · from today's news & tape" : "From today's news & tape"}</div>
            </div>
          </div>
          <button onClick={loadTradeRead} className="btn btn-ghost !py-1.5 !px-3 text-[.75rem]" disabled={tradeLoading}><Icon name="repeat" size={13} /> {tradeLoading ? "Reading…" : "Refresh"}</button>
        </div>
        {tradeLoading && !tradeRead ? (
          <div className="space-y-2"><div className="skeleton" style={{ height: 13, width: "94%" }} /><div className="skeleton" style={{ height: 13, width: "88%" }} /><div className="skeleton" style={{ height: 13, width: "70%" }} /></div>
        ) : (
          <p className="text-[.95rem] text-t1 leading-relaxed">{tradeRead?.text || "Trade read unavailable — tap refresh."}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-4">
          <Panel title="Key levels in play" icon={<Icon name="chart" />} action={<button className="text-acc text-xs" onClick={() => go("charts")}>charts →</button>}>
            {levels ? <KeyLevels lv={levels} /> : <EmptyState icon="chart" title="Levels loading" body="Prior-day high/low/close, the overnight range, today's gap and expected range for your instrument — the map every day trader reads before the open." />}
          </Panel>

          <Panel title="Your edge clock" icon={<Icon name="clock" />} action={<button className="text-acc text-xs" onClick={() => go("insights")}>insights →</button>}>
            {clockBuckets.length ? (
              <EdgeClock buckets={clockBuckets} best={ins?.bestWindow || null} worst={ins?.worstWindow || null} nowKey={nowKey} />
            ) : <EmptyState icon="clock" title="When you trade best" body="Add trades and this clock shows your most and least profitable hours, with a live now-marker — so you know when to be at the screen." cta={setProfile && <button onClick={() => setProfile(demoProfile(profile))} className="btn btn-primary text-sm">Load demo data</button>} />}
          </Panel>

          <Panel title="Today's plan" icon={<Icon name="target" />}>
            <ol className="space-y-3.5">
              {buildPlan().map((p, i) => (
                <li key={i} className="flex gap-3.5 items-start">
                  <span className="ring-num shrink-0">{i + 1}</span>
                  <span className="text-[.92rem] text-t1 leading-relaxed pt-0.5">{p}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid sm:grid-cols-2 gap-4">
            <Panel title="Your biggest leak" icon={<Icon name="down" />} action={<button className="text-acc text-xs" onClick={() => go("insights")}>insights →</button>}>
              {topLeak ? (
                <div>
                  <div className="font-semibold text-red text-[.95rem]">{topLeak.title}</div>
                  <p className="text-[.82rem] text-t2 mt-1.5 leading-relaxed">{topLeak.detail}</p>
                  <div className="mt-3 flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ background: "rgba(220,38,38,.07)", border: "1px solid rgba(220,38,38,.2)" }}>
                    <span className="text-[.8rem] text-t1">{topLeak.fix}</span>
                    <span className="mono font-bold text-red text-[.95rem] shrink-0 ml-3">{usd(-topLeak.cost)}</span>
                  </div>
                </div>
              ) : <EmptyState icon="spark" title="No leaks yet" body="Add ~20+ trades and we'll rank what's costing you the most." cta={setProfile && <button onClick={() => setProfile(demoProfile(profile))} className="btn btn-primary text-sm">Load demo data</button>} />}
            </Panel>
            <Panel title="What's working" icon={<Icon name="up" />}>
              {ins && ins.strengths.length ? (
                <ul className="space-y-2.5">{ins.strengths.slice(0, 4).map((s, i) => <li key={i} className="text-[.85rem] text-t2 flex gap-2.5 leading-relaxed"><span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "var(--grn)" }} />{s}</li>)}</ul>
              ) : <EmptyState icon="gauge" title="Your edge, surfaced" body="Add trades to see your best hours, days, and setups." />}
            </Panel>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <button onClick={() => go("risk")} className="card card-hover p-5 w-full flex items-center gap-4 text-left">
            {tightest ? (
              <>
                <Ring pct={Math.max(.04, Math.min(1, tightest.pctBuffer))} color={tm!.color} size={72}>
                  <span className="mono text-[.85rem] font-bold" style={{ color: tm!.color }}>{Math.round(tightest.pctBuffer * 100)}%</span>
                </Ring>
                <div><div className="lbl mb-0.5">Distance to breach</div><div className="mono text-xl font-bold" style={{ color: tm!.color }}>{usd(Math.max(0, tightest.distanceToBreach))}</div><div className="text-[.7rem] text-t3 mt-0.5">{tightest.firm.firmBrand}</div></div>
              </>
            ) : <div className="text-t3 text-sm py-3">No accounts — <span className="text-acc">add one →</span></div>}
          </button>

          <button onClick={() => go("journal")} className="card card-hover p-5 w-full flex items-center gap-4 text-left">
            {score ? (
              <>
                <Ring pct={score.traderScore / 100} color={scoreColor(score.traderScore)} size={72}>
                  <span className="mono text-base font-bold" style={{ color: scoreColor(score.traderScore) }}>{score.traderScore}</span>
                </Ring>
                <div><div className="lbl mb-0.5">Trader Score · {score.grade}</div><div className="text-[.9rem] text-t1 font-medium">{score.decision === "FUNDED" ? "Fundable edge" : score.decision === "CONDITIONAL" ? "Borderline edge" : "Unproven edge"}</div><div className="text-[.7rem] text-t3 mt-0.5">confidence {pct(score.confidence)}</div></div>
              </>
            ) : <><Ring pct={0} color="var(--acc)" size={72}><span className="text-t3">?</span></Ring><div><div className="lbl mb-0.5">Trader Score</div><div className="text-[.82rem] text-t2">Add trades →</div></div></>}
          </button>

          {dayTarget != null && (
            <div className="card p-5">
              <div className="lbl mb-2">Your number today</div>
              <div className="flex items-center justify-between">
                <div><div className="text-[.7rem] text-t3">Aim for</div><div className="mono text-lg font-bold" style={{ color: "var(--grn)" }}>+{usd(dayTarget)}</div></div>
                <div className="text-right"><div className="text-[.7rem] text-t3">Walk away at</div><div className="mono text-lg font-bold" style={{ color: "var(--red)" }}>{usd(-profile.settings.dailyLossStop)}</div></div>
              </div>
              <div className="text-[.72rem] text-t3 mt-2.5 leading-relaxed">Your typical green day. Bank it and stop — chasing past your number is how green days turn red.</div>
            </div>
          )}

          <Panel title="High-impact calendar" icon={<Icon name="clock" />} action={<button className="text-acc text-xs" onClick={() => go("news")}>all →</button>}>
            {events === null ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}</div>
              : upcoming.length ? (
                <ul className="space-y-2.5">
                  {upcoming.map((e, i) => {
                    const t = new Date(e.date); const mins = Math.round((+t - now.getTime()) / 60000);
                    const soon = mins >= 0 && mins < 90;
                    return (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <div className="min-w-0"><div className="text-[.85rem] text-t1 truncate">{e.title}</div><div className="text-[.68rem] text-t3">{t.toLocaleDateString("en-US", { weekday: "short" })} {t.toUTCString().slice(17, 22)} UTC</div></div>
                        <span className="chip shrink-0" style={{ color: soon ? "var(--amb)" : "var(--t3)", borderColor: soon ? "rgba(217,119,6,.4)" : "var(--line2)" }}>{mins < 0 ? "now" : mins < 60 ? mins + "m" : mins < 1440 ? Math.round(mins / 60) + "h" : Math.round(mins / 1440) + "d"}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : <div className="text-[.88rem] py-2" style={{ color: "var(--grn)" }}>No high-impact events soon — clear runway.</div>}
          </Panel>

          <button onClick={() => go("coach")} className="card card-hover p-5 w-full text-left">
            <div className="flex items-center gap-3 mb-1.5"><span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--acc-weak)", border: "1px solid var(--line2)", color: "var(--acc)" }}><Icon name="brain" size={16} /></span><div className="font-semibold text-[.95rem]">Ask your AI coach</div></div>
            <div className="text-[.82rem] text-t2 leading-relaxed">“What's my biggest flaw?” · “Will I blow this account?” · “What should I cut?”</div>
          </button>
        </aside>
      </div>
    </div>
  );
}
