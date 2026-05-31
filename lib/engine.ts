// FundedCore engine — pure, framework-free logic (unit-tested in node)

export type Instrument = { name: string; perPoint: number };
export const INSTRUMENTS: Record<string, Instrument> = {
  MNQ: { name: "MNQ · Micro Nasdaq", perPoint: 2 },
  NQ: { name: "NQ · E-mini Nasdaq", perPoint: 20 },
  MES: { name: "MES · Micro S&P", perPoint: 5 },
  ES: { name: "ES · E-mini S&P", perPoint: 50 },
  MGC: { name: "MGC · Micro Gold", perPoint: 10 },
};

export type Firm = {
  key: string; name: string; start: number;
  dailyLoss: number | null; trailingDD: number; contractCap: number;
  consistency: number; minDays: number; restricted: string[];
};

// Illustrative, simplified rule packs — NOT official firm terms.
export const FIRMS: Record<string, Firm> = {
  topstep50: { key: "topstep50", name: "Topstep 50K (illustrative)", start: 50000, dailyLoss: 1000, trailingDD: 2000, contractCap: 5, consistency: 0.5, minDays: 2, restricted: [] },
  topstep100: { key: "topstep100", name: "Topstep 100K (illustrative)", start: 100000, dailyLoss: 2000, trailingDD: 3000, contractCap: 10, consistency: 0.5, minDays: 2, restricted: [] },
  topstep150: { key: "topstep150", name: "Topstep 150K (illustrative)", start: 150000, dailyLoss: 3000, trailingDD: 4500, contractCap: 15, consistency: 0.5, minDays: 2, restricted: [] },
  apex50: { key: "apex50", name: "Apex 50K (illustrative)", start: 50000, dailyLoss: null, trailingDD: 2500, contractCap: 10, consistency: 0.3, minDays: 0, restricted: [] },
  apex100: { key: "apex100", name: "Apex 100K (illustrative)", start: 100000, dailyLoss: null, trailingDD: 3000, contractCap: 14, consistency: 0.3, minDays: 0, restricted: [] },
  apex250: { key: "apex250", name: "Apex 250K (illustrative)", start: 250000, dailyLoss: null, trailingDD: 6500, contractCap: 27, consistency: 0.3, minDays: 0, restricted: [] },
  tpt50: { key: "tpt50", name: "Take Profit Trader 50K (illustrative)", start: 50000, dailyLoss: 1100, trailingDD: 2000, contractCap: 5, consistency: 0.4, minDays: 5, restricted: [] },
  tpt100: { key: "tpt100", name: "Take Profit Trader 100K (illustrative)", start: 100000, dailyLoss: 2200, trailingDD: 3000, contractCap: 10, consistency: 0.4, minDays: 5, restricted: [] },
  mff50: { key: "mff50", name: "MyFundedFutures 50K (illustrative)", start: 50000, dailyLoss: 1200, trailingDD: 2000, contractCap: 5, consistency: 0.4, minDays: 1, restricted: [] },
  mff100: { key: "mff100", name: "MyFundedFutures 100K (illustrative)", start: 100000, dailyLoss: 2400, trailingDD: 3000, contractCap: 10, consistency: 0.4, minDays: 1, restricted: [] },
};

export type Trade = {
  id: number; day: number; date: string; hour: number; instrument: string;
  setup: string; dir: string; size: number; risk: number; R: number; pnl: number; revenge: boolean;
};

// ---------- seeded RNG ----------
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- sample journal (deterministic) ----------
export function generateJournal(): Trade[] {
  const rnd = mulberry32(20260530);
  const SETUPS: Record<string, { hours: number[]; wr: number; win: number; loss: number; baseRisk: number; inst: string[] }> = {
    ORB: { hours: [9, 10], wr: 0.57, win: 1.9, loss: 1.0, baseRisk: 100, inst: ["NQ", "MNQ"] },
    "Trend Pull": { hours: [11, 12], wr: 0.49, win: 1.5, loss: 1.0, baseRisk: 100, inst: ["MNQ", "MES"] },
    Reversal: { hours: [13, 14, 15], wr: 0.39, win: 1.3, loss: 1.05, baseRisk: 100, inst: ["MNQ", "MGC"] },
  };
  const trades: Trade[] = [];
  let id = 1;
  const startDay = new Date(2026, 2, 2);
  for (let d = 0; d < 60; d++) {
    const date = new Date(startDay.getTime() + d * 86400000);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const nTrades = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nTrades; k++) {
      const skeys = Object.keys(SETUPS);
      const setup = skeys[Math.floor(rnd() * skeys.length)];
      const cfg = SETUPS[setup];
      const hour = cfg.hours[Math.floor(rnd() * cfg.hours.length)];
      const inst = cfg.inst[Math.floor(rnd() * cfg.inst.length)];
      const size = 1 + Math.floor(rnd() * 2);
      const win = rnd() < cfg.wr;
      const noise = (rnd() - 0.5) * 0.5;
      const R = win ? cfg.win + noise : -(cfg.loss + Math.abs(noise) * 0.3);
      const pnl = Math.round(R * cfg.baseRisk);
      trades.push({ id: id++, day: d, date: date.toISOString().slice(0, 10), hour, instrument: inst, setup, dir: rnd() < 0.5 ? "Long" : "Short", size, risk: cfg.baseRisk, R: +R.toFixed(2), pnl, revenge: false });
      if (pnl < 0 && rnd() < 0.45) {
        const rhour = Math.min(15, hour + 1);
        const rinst = rnd() < 0.6 ? "NQ" : "MNQ";
        const rsize = 3 + Math.floor(rnd() * 3);
        const rwin = rnd() < 0.33;
        const rnoise = (rnd() - 0.5) * 0.5;
        const rR = rwin ? 1.1 + rnoise : -(1.25 + Math.abs(rnoise) * 0.4);
        const rrisk = 240 + Math.floor(rnd() * 120);
        trades.push({ id: id++, day: d, date: date.toISOString().slice(0, 10), hour: rhour, instrument: rinst, setup: "Revenge", dir: rnd() < 0.5 ? "Long" : "Short", size: rsize, risk: rrisk, R: +rR.toFixed(2), pnl: Math.round(rR * rrisk), revenge: true });
      }
    }
  }
  return trades;
}

// ---------- CSV import ----------
// Accepts headers: date,hour,instrument,setup,dir,size,pnl   (R/risk optional)
export function parseCSV(text: string): Trade[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const splitRow = (s: string) => {
    const out: string[] = []; let cur = "", q = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim().replace(/^"|"$/g, ""));
  };
  const head = splitRow(lines[0]).map((h) => h.toLowerCase());
  const find = (...keys: string[]) => { for (const k of keys) { const j = head.findIndex((h) => h.includes(k)); if (j >= 0) return j; } return -1; };
  const iDate = find("date"), iHour = find("hour", "time"),
    iInst = find("instrument", "symbol", "ticker"),
    iSetup = find("setup", "strategy", "playbook"), iTag = find("tag"),
    iDir = find("side", "dir", "direction"),
    iSize = find("size", "qty", "contract", "quantity", "lots"),
    iPnl = find("pnl", "p&l", "p/l", "profit", "net", "realized"),
    iR = head.findIndex((h) => h === "r"), iRisk = find("risk");
  const cell = (c: string[], j: number) => (j >= 0 && j < c.length ? c[j] : "");
  const numv = (s: string) => { const neg = /\(/.test(s); const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")) || 0; return neg ? -Math.abs(n) : n; };
  const out: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitRow(lines[i]);
    const pnl = Math.round(numv(cell(c, iPnl)));
    const risk = Math.abs(numv(cell(c, iRisk))) || 100;
    const Rraw = cell(c, iR);
    const R = Rraw ? (parseFloat(Rraw) || 0) : +(pnl / risk).toFixed(2);
    out.push({
      id: i, day: i, date: cell(c, iDate) || "",
      hour: parseInt(cell(c, iHour)) || 10,
      instrument: (cell(c, iInst) || "NQ").toUpperCase().slice(0, 6),
      setup: cell(c, iSetup) || "Untagged",
      dir: /sell|short/i.test(cell(c, iDir)) ? "Short" : "Long",
      size: parseInt(cell(c, iSize)) || 1,
      risk, R: +R.toFixed(2), pnl,
      revenge: /revenge|chase|tilt/i.test(cell(c, iSetup) + " " + cell(c, iTag)),
    });
  }
  return out;
}

export const CSV_TEMPLATE = "date,hour,instrument,setup,dir,size,pnl\n2026-03-02,9,NQ,ORB,Long,1,180\n2026-03-02,13,MNQ,Reversal,Short,2,-160\n";

// ---------- expectancy ----------
export type Stat = { n: number; winRate: number; avgR: number; exp: number; sum: number };
export function expectancy(rows: Trade[]): Stat {
  if (!rows.length) return { n: 0, winRate: 0, avgR: 0, exp: 0, sum: 0 };
  const wins = rows.filter((t) => t.pnl > 0).length;
  const sum = rows.reduce((a, t) => a + t.pnl, 0);
  const avgR = rows.reduce((a, t) => a + t.R, 0) / rows.length;
  return { n: rows.length, winRate: wins / rows.length, avgR, exp: sum / rows.length, sum };
}

export type Group = { key: string } & Stat;
export function groupBy(trades: Trade[], keyFn: (t: Trade) => string): Group[] {
  const m: Record<string, Trade[]> = {};
  trades.forEach((t) => { const k = keyFn(t); (m[k] = m[k] || []).push(t); });
  return Object.keys(m).map((k) => ({ key: k, ...expectancy(m[k]) }));
}
export function hourBucket(h: number): string {
  if (h <= 10) return "09:00–10:59";
  if (h <= 12) return "11:00–12:59";
  return "13:00–15:59";
}

// ---------- counterfactual equity ----------
export function equitySeries(trades: Trade[]): { A: number[]; B: number[]; negSetups: string[] } {
  const setupAgg = groupBy(trades, (t) => t.setup);
  const negSetups = new Set(setupAgg.filter((r) => r.exp < 0).map((r) => r.key));
  let a = 0, b = 0;
  const A: number[] = [], B: number[] = [];
  trades.forEach((t) => {
    a += t.pnl; A.push(a);
    if (!negSetups.has(t.setup)) b += t.pnl;
    B.push(b);
  });
  return { A, B, negSetups: Array.from(negSetups) };
}

// ---------- behavioral engine ----------
export type Signature = { name: string; sev: "high" | "med" | "low"; desc: string; stats: [string | number, string][]; score: number };
export function behaviorSignatures(trades: Trade[]): Signature[] {
  const sigs: Signature[] = [];
  const base = trades.filter((t) => !t.revenge);
  const baseAvgSize = base.reduce((a, t) => a + t.size, 0) / Math.max(1, base.length);
  const rev = trades.filter((t) => t.revenge);
  if (rev.length) {
    const revAvgSize = rev.reduce((a, t) => a + t.size, 0) / rev.length;
    const revExp = expectancy(rev);
    const mult = revAvgSize / Math.max(0.1, baseAvgSize);
    const byDay: Record<number, Trade[]> = {};
    trades.forEach((t) => { (byDay[t.day] = byDay[t.day] || []).push(t); });
    let blown = 0;
    Object.values(byDay).forEach((day) => {
      let cum = 0, hitWith = false, hitWithout = false;
      day.forEach((t) => { cum += t.pnl; if (cum <= -1000) hitWith = true; });
      let cum2 = 0;
      day.filter((t) => !t.revenge).forEach((t) => { cum2 += t.pnl; if (cum2 <= -1000) hitWithout = true; });
      if (hitWith && !hitWithout) blown++;
    });
    sigs.push({
      name: "Revenge sizing after losses", sev: mult >= 2 ? "high" : "med",
      desc: `After a losing trade you size up to <b>${mult.toFixed(1)}×</b> your normal position and chase. These trades carry negative expectancy of <b>$${revExp.exp.toFixed(0)}</b> each — and on <b>${blown}</b> day(s) a revenge trade is what pushed you past a daily-loss limit you would otherwise have respected.`,
      stats: [["+" + rev.length, "revenge trades"], ["$" + revExp.sum.toFixed(0), "total P&L"], [blown, "accounts it cost you"]],
      score: Math.abs(revExp.sum) + blown * 800,
    });
  }
  const hAgg = groupBy(trades, (t) => hourBucket(t.hour)).sort((a, b) => a.exp - b.exp);
  const worst = hAgg[0];
  if (worst && worst.exp < 0) {
    sigs.push({
      name: "Time-of-day tilt window", sev: worst.exp < -30 ? "high" : "med",
      desc: `Your <b>${worst.key}</b> block is your weakest window: <b>${(worst.winRate * 100).toFixed(0)}%</b> win rate and <b>$${worst.exp.toFixed(0)}</b> expectancy per trade across ${worst.n} trades. Most traders have one window where focus drops — this is yours.`,
      stats: [[worst.n, "trades"], [(worst.winRate * 100).toFixed(0) + "%", "win rate"], ["$" + worst.sum.toFixed(0), "net in window"]],
      score: Math.abs(worst.sum),
    });
  }
  const byDay: Record<number, Trade[]> = {};
  trades.forEach((t) => { (byDay[t.day] = byDay[t.day] || []).push(t); });
  const days = Object.values(byDay);
  const red = days.filter((d) => d.reduce((a, t) => a + t.pnl, 0) < 0);
  const green = days.filter((d) => d.reduce((a, t) => a + t.pnl, 0) >= 0);
  const redAvg = red.reduce((a, d) => a + d.length, 0) / Math.max(1, red.length);
  const greenAvg = green.reduce((a, d) => a + d.length, 0) / Math.max(1, green.length);
  if (redAvg > greenAvg * 1.15) {
    sigs.push({
      name: "Overtrading on red days", sev: redAvg > greenAvg * 1.5 ? "med" : "low",
      desc: `On losing days you take <b>${redAvg.toFixed(1)}</b> trades vs <b>${greenAvg.toFixed(1)}</b> on green days. Trying to "trade your way back" extends red days instead of ending them. The discipline move is a hard trade-count cap once you're red.`,
      stats: [[redAvg.toFixed(1), "trades / red day"], [greenAvg.toFixed(1), "trades / green day"], [red.length, "red days"]],
      score: (redAvg - greenAvg) * 200,
    });
  }
  return sigs.sort((a, b) => b.score - a.score);
}

// ---------- pre-trade firewall ----------
export type Verdict = "APPROVE" | "REDUCE" | "WAIT" | "BLOCK";
export type AcctState = { todayPnL: number; trailingRoom: number; daysTraded: number };
export type CheckInput = { instrument: string; size: number; stop: number; news: boolean; tilt: boolean };
export type CheckResult = { verdict: Verdict; reason: string; worstCase: number; safeSize: number; checks: { l: string; s: "ok" | "warn" | "bad"; v: string }[]; binding?: number };

export function preTradeCheck(firm: Firm, acct: AcctState, trade: CheckInput): CheckResult {
  const inst = INSTRUMENTS[trade.instrument];
  const slip = 1.0;
  const worstCase = Math.round(trade.size * inst.perPoint * (trade.stop + slip));
  const checks: CheckResult["checks"] = [];
  let verdict: Verdict = "APPROVE";
  let reason = "";
  let safeSize = trade.size;
  const dailyRoom = firm.dailyLoss == null ? Infinity : Math.max(0, firm.dailyLoss - Math.max(0, -acct.todayPnL));
  const trailingRoom = acct.trailingRoom;
  const binding = Math.min(dailyRoom, trailingRoom);

  if (firm.restricted.includes(trade.instrument)) {
    return { verdict: "BLOCK", reason: `<b>${trade.instrument}</b> is a restricted instrument on this account.`, worstCase, safeSize: 0, checks: [{ l: "restricted_instrument", s: "bad", v: "BLOCKED" }] };
  }
  checks.push({ l: "worst_case_loss", s: worstCase <= binding ? "ok" : "bad", v: "$" + worstCase });
  checks.push({ l: "daily_loss_room", s: dailyRoom === Infinity ? "ok" : worstCase <= dailyRoom ? "ok" : "bad", v: dailyRoom === Infinity ? "n/a" : "$" + dailyRoom + " left" });
  checks.push({ l: "trailing_drawdown", s: worstCase <= trailingRoom ? "ok" : "bad", v: "$" + trailingRoom + " away" });
  checks.push({ l: "contract_cap", s: trade.size > firm.contractCap ? "warn" : "ok", v: firm.contractCap + " max" });

  if (trade.news) { verdict = "WAIT"; reason = "A restricted <b>news window</b> is active. Hold until it clears."; checks.push({ l: "news_window", s: "warn", v: "RESTRICTED" }); }
  else checks.push({ l: "news_window", s: "ok", v: "clear" });
  if (trade.tilt) { if (verdict === "APPROVE") verdict = "WAIT"; reason = reason || "You are <b>2 losses deep today</b> — a post-loss cool-down is active. Step away before sizing in again."; checks.push({ l: "post_loss_cooldown", s: "warn", v: "ACTIVE" }); }
  else checks.push({ l: "post_loss_cooldown", s: "ok", v: "clear" });

  const maxByLoss = binding === Infinity ? trade.size : Math.floor(binding / (inst.perPoint * (trade.stop + slip)));
  safeSize = Math.min(trade.size, maxByLoss, firm.contractCap);
  if (verdict === "APPROVE") {
    if (safeSize <= 0) { verdict = "BLOCK"; reason = `Worst-case loss of <b>$${worstCase}</b> exceeds your remaining room of <b>$${binding}</b>. No safe size — protect the account.`; }
    else if (safeSize < trade.size) { verdict = "REDUCE"; reason = `At ${trade.size} contracts, worst-case loss is <b>$${worstCase}</b> — over your <b>$${binding}</b> room. Largest safe size is <b>${safeSize}</b>.`; }
    else { reason = `Within every limit. Worst-case loss <b>$${worstCase}</b> against <b>$${binding === Infinity ? "∞" : binding}</b> of room. Cleared to take it.`; }
  }
  return { verdict, reason, worstCase, safeSize, checks, binding };
}

export function fmtMoney(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
}
