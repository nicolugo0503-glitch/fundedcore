// FundedCore engine — real prop firm rules, accurate as of June 2026.
// Sources: topstep.com, apextraderfunding.com, myfundedfutures.com, tradeday.io
// NOT financial or legal advice. Always verify rules directly with your firm.

// ────────────────────────────────────────────────────────────────────────────
// INSTRUMENTS — dollar value per 1 contract per 1 price point
// ────────────────────────────────────────────────────────────────────────────
export type Instrument = {
  name: string;
  perPoint: number;    // $ per contract per 1 price point
  tickSize: number;    // smallest increment
  exchange: string;
  stopUnit: string;    // human label for the stop field ("points", "ticks", etc.)
};

export const INSTRUMENTS: Record<string, Instrument> = {
  // ── Equity Index Futures ──────────────────────────────────────────────────
  MES: { name: "MES · Micro E-mini S&P 500",     perPoint: 5,    tickSize: 0.25, exchange: "CME",  stopUnit: "pts" },
  ES:  { name: "ES · E-mini S&P 500",             perPoint: 50,   tickSize: 0.25, exchange: "CME",  stopUnit: "pts" },
  MNQ: { name: "MNQ · Micro E-mini Nasdaq-100",   perPoint: 2,    tickSize: 0.25, exchange: "CME",  stopUnit: "pts" },
  NQ:  { name: "NQ · E-mini Nasdaq-100",           perPoint: 20,   tickSize: 0.25, exchange: "CME",  stopUnit: "pts" },
  MYM: { name: "MYM · Micro E-mini Dow Jones",    perPoint: 0.5,  tickSize: 1,    exchange: "CBOT", stopUnit: "pts" },
  YM:  { name: "YM · E-mini Dow Jones",            perPoint: 5,    tickSize: 1,    exchange: "CBOT", stopUnit: "pts" },
  M2K: { name: "M2K · Micro E-mini Russell 2000", perPoint: 5,    tickSize: 0.1,  exchange: "CME",  stopUnit: "pts" },
  RTY: { name: "RTY · E-mini Russell 2000",        perPoint: 50,   tickSize: 0.1,  exchange: "CME",  stopUnit: "pts" },
  // ── Metals ────────────────────────────────────────────────────────────────
  MGC: { name: "MGC · Micro Gold",                 perPoint: 10,   tickSize: 0.1,  exchange: "COMEX", stopUnit: "pts ($1/pt)" },
  GC:  { name: "GC · Gold Futures (100 oz)",       perPoint: 100,  tickSize: 0.1,  exchange: "COMEX", stopUnit: "pts ($1/pt)" },
  // ── Energy ────────────────────────────────────────────────────────────────
  MCL: { name: "MCL · Micro WTI Crude Oil",        perPoint: 10,   tickSize: 0.01, exchange: "NYMEX", stopUnit: "ticks ($0.01/bbl)" },
  CL:  { name: "CL · WTI Crude Oil (1000 bbl)",    perPoint: 100,  tickSize: 0.01, exchange: "NYMEX", stopUnit: "ticks ($0.01/bbl)" },
};

// ────────────────────────────────────────────────────────────────────────────
// FIRM RULES — verified from official help centers, June 2026
// ────────────────────────────────────────────────────────────────────────────
export type DrawdownType = "intraday_trailing" | "eod_trailing" | "static";
export type Phase = "evaluation" | "funded";

export type Firm = {
  key: string;
  name: string;
  firmBrand: string;          // e.g. "TopStep", "Apex", "MyFundedFutures"
  phase: Phase;
  start: number;              // account size
  dailyLoss: number | null;   // daily loss limit (null = none); hitting it suspends trading for session
  trailingDD: number;         // maximum trailing drawdown amount
  drawdownType: DrawdownType; // how the trailing DD behaves
  contractCap: number;        // max contracts (starting / hard cap)
  consistency: number;        // max fraction of profit from single day (0 = no rule)
  minDays: number;            // minimum trading days required
  newsRestricted: boolean;    // firm explicitly restricts news trading
  profitTarget: number;       // 0 for funded accounts with no profit target
  restricted: string[];       // restricted instrument keys
  notes: string;              // key gotcha for this account
};

// NOTE: dailyLoss for TopStep Combine is a soft limit — auto-liquidates but NOT a rule violation.
// Exceeding trailingDD is always the account-ending rule.
export const FIRMS: Record<string, Firm> = {
  // ── TopStep Trading Combine (Evaluation) ──────────────────────────────────
  topstep50: {
    key: "topstep50", name: "TopStep Combine 50K", firmBrand: "TopStep",
    phase: "evaluation", start: 50000,
    dailyLoss: 1000,        // soft — auto-liquidates session, not a violation
    trailingDD: 2000,       // intraday trailing — moves with live equity high
    drawdownType: "intraday_trailing",
    contractCap: 5,         // 5 standard minis or 50 micros
    consistency: 0.5,       // best day must be <50% of total profit
    minDays: 0,             // no minimum days
    newsRestricted: false,  // no official news ban, but recommended
    profitTarget: 3000,     // $3,000 profit target to pass
    restricted: [],
    notes: "Intraday trailing: a wick to the floor during the session ends the account even if you close green.",
  },
  topstep100: {
    key: "topstep100", name: "TopStep Combine 100K", firmBrand: "TopStep",
    phase: "evaluation", start: 100000,
    dailyLoss: 2000, trailingDD: 3000, drawdownType: "intraday_trailing",
    contractCap: 10, consistency: 0.5, minDays: 0, newsRestricted: false,
    profitTarget: 6000, restricted: [],
    notes: "10 contracts max. $6K profit target.",
  },
  topstep150: {
    key: "topstep150", name: "TopStep Combine 150K", firmBrand: "TopStep",
    phase: "evaluation", start: 150000,
    dailyLoss: 3000, trailingDD: 4500, drawdownType: "intraday_trailing",
    contractCap: 15, consistency: 0.5, minDays: 0, newsRestricted: false,
    profitTarget: 9000, restricted: [],
    notes: "15 contracts max. $9K profit target.",
  },

  // ── TopStep Express Funded Account (XFA) ─────────────────────────────────
  topstep_xfa50: {
    key: "topstep_xfa50", name: "TopStep XFA 50K", firmBrand: "TopStep",
    phase: "funded", start: 50000,
    dailyLoss: null,        // no daily loss limit (optional add-on)
    trailingDD: 2000,       // EOD trailing — only updates at end of day
    drawdownType: "eod_trailing",
    contractCap: 5,         // scaling plan starts at 5 contracts
    consistency: 0,         // no consistency rule (Standard path)
    minDays: 0, newsRestricted: false, profitTarget: 0, restricted: [],
    notes: "EOD trailing: intraday drawdowns don't move the floor. Locks permanently once floor reaches $50,000.",
  },
  topstep_xfa100: {
    key: "topstep_xfa100", name: "TopStep XFA 100K", firmBrand: "TopStep",
    phase: "funded", start: 100000,
    dailyLoss: null, trailingDD: 3000, drawdownType: "eod_trailing",
    contractCap: 10, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 0, restricted: [],
    notes: "EOD trailing. 90/10 split. First payout cap $6K.",
  },
  topstep_xfa150: {
    key: "topstep_xfa150", name: "TopStep XFA 150K", firmBrand: "TopStep",
    phase: "funded", start: 150000,
    dailyLoss: null, trailingDD: 4500, drawdownType: "eod_trailing",
    contractCap: 15, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 0, restricted: [],
    notes: "EOD trailing. 90/10 split.",
  },

  // ── Apex EOD Evaluation ───────────────────────────────────────────────────
  apex25: {
    key: "apex25", name: "Apex EOD Eval 25K", firmBrand: "Apex",
    phase: "evaluation", start: 25000,
    dailyLoss: 500,         // DLL pauses trading for the day — not account-ending
    trailingDD: 1000,       // EOD trailing
    drawdownType: "eod_trailing",
    contractCap: 4, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 1500, restricted: [],
    notes: "No min trading days — can pass in 1 day. Safety net locks DD at start+drawdown+$100.",
  },
  apex50: {
    key: "apex50", name: "Apex EOD Eval 50K", firmBrand: "Apex",
    phase: "evaluation", start: 50000,
    dailyLoss: 1000, trailingDD: 2000, drawdownType: "eod_trailing",
    contractCap: 6, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 3000, restricted: [],
    notes: "EOD trailing. Safety net = $52,100.",
  },
  apex100: {
    key: "apex100", name: "Apex EOD Eval 100K", firmBrand: "Apex",
    phase: "evaluation", start: 100000,
    dailyLoss: 1500, trailingDD: 3000, drawdownType: "eod_trailing",
    contractCap: 8, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 6000, restricted: [],
    notes: "EOD trailing. Safety net = $103,100.",
  },
  apex150: {
    key: "apex150", name: "Apex EOD Eval 150K", firmBrand: "Apex",
    phase: "evaluation", start: 150000,
    dailyLoss: 2000, trailingDD: 4000, drawdownType: "eod_trailing",
    contractCap: 12, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 9000, restricted: [],
    notes: "EOD trailing. Safety net = $154,100.",
  },
  // Keep old apex250 key for backward compat — map to nearest real account
  apex250: {
    key: "apex250", name: "Apex EOD Eval 150K (legacy key)", firmBrand: "Apex",
    phase: "evaluation", start: 150000,
    dailyLoss: 2000, trailingDD: 4000, drawdownType: "eod_trailing",
    contractCap: 12, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 9000, restricted: [],
    notes: "Apex's largest standard account is $150K. Use apex150 instead.",
  },

  // ── MyFundedFutures ────────────────────────────────────────────────────────
  mff50: {
    key: "mff50", name: "MFF Core 50K", firmBrand: "MyFundedFutures",
    phase: "evaluation", start: 50000,
    dailyLoss: null,        // no daily loss limit
    trailingDD: 1500,       // 3% EOD trailing
    drawdownType: "eod_trailing",
    contractCap: 5, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 3000, restricted: [],
    notes: "No DLL. $77/mo. EOD trailing locks at starting balance.",
  },
  mff100: {
    key: "mff100", name: "MFF Rapid 100K", firmBrand: "MyFundedFutures",
    phase: "evaluation", start: 100000,
    dailyLoss: null,
    trailingDD: 4000,       // 4% intraday trailing for Rapid
    drawdownType: "intraday_trailing",
    contractCap: 10, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 5000, restricted: [],
    notes: "Rapid plan: 4% intraday trailing, 90/10 split.",
  },
  mff_rapid50: {
    key: "mff_rapid50", name: "MFF Rapid 50K", firmBrand: "MyFundedFutures",
    phase: "evaluation", start: 50000,
    dailyLoss: null, trailingDD: 2000, drawdownType: "intraday_trailing",
    contractCap: 5, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 2500, restricted: [],
    notes: "Rapid plan: 4% intraday trailing. Locks at initial balance.",
  },

  // ── TradeDay ───────────────────────────────────────────────────────────────
  tpt50: {
    key: "tpt50", name: "TradeDay 50K", firmBrand: "TradeDay",
    phase: "evaluation", start: 50000,
    dailyLoss: null,        // no daily loss limit — TradeDay differentiator
    trailingDD: 2500,       // EOD trailing
    drawdownType: "eod_trailing",
    contractCap: 5, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 3000, restricted: [],
    notes: "No DLL, no consistency rule — rare combination. EOD trailing only.",
  },
  tpt100: {
    key: "tpt100", name: "TradeDay 100K", firmBrand: "TradeDay",
    phase: "evaluation", start: 100000,
    dailyLoss: null, trailingDD: 5000, drawdownType: "eod_trailing",
    contractCap: 10, consistency: 0, minDays: 0, newsRestricted: false,
    profitTarget: 5000, restricted: [],
    notes: "No DLL, no consistency rule. 90/10 split.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// ECONOMIC NEWS CALENDAR — 2026 high-impact events (US ET times)
// Source: approximated from BLS/Fed schedules. Verify at econoday.com
// ────────────────────────────────────────────────────────────────────────────
export type NewsEvent = {
  date: string;          // YYYY-MM-DD
  hour: number;          // ET hour (24h)
  minute: number;
  name: string;
  tier: "high" | "med";
  windowMins: number;    // block trading this many minutes before & after
};

// High-impact events that most funded prop firms warn against trading during.
// "high" tier = FOMC, CPI, NFP. "med" = PPI, PCE, retail sales, GDP.
export const NEWS_CALENDAR: NewsEvent[] = [
  // ── June 2026 ─────────────────────────────────────────────────────────────
  { date: "2026-06-05", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-06-11", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-06-12", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-06-13", hour: 8,  minute: 30, name: "Retail Sales",  tier: "med",  windowMins: 3 },
  { date: "2026-06-18", hour: 14, minute: 0,  name: "FOMC Decision", tier: "high", windowMins: 10 },
  { date: "2026-06-26", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── July 2026 ─────────────────────────────────────────────────────────────
  { date: "2026-07-02", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-07-15", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-07-16", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-07-17", hour: 8,  minute: 30, name: "Retail Sales",  tier: "med",  windowMins: 3 },
  { date: "2026-07-30", hour: 14, minute: 0,  name: "FOMC Decision", tier: "high", windowMins: 10 },
  { date: "2026-07-31", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── August 2026 ───────────────────────────────────────────────────────────
  { date: "2026-08-07", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-08-13", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-08-14", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-08-15", hour: 8,  minute: 30, name: "Retail Sales",  tier: "med",  windowMins: 3 },
  { date: "2026-08-28", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── September 2026 ────────────────────────────────────────────────────────
  { date: "2026-09-04", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-09-10", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-09-11", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-09-17", hour: 14, minute: 0,  name: "FOMC Decision", tier: "high", windowMins: 10 },
  { date: "2026-09-26", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── October 2026 ──────────────────────────────────────────────────────────
  { date: "2026-10-02", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-10-14", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-10-15", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-10-16", hour: 8,  minute: 30, name: "Retail Sales",  tier: "med",  windowMins: 3 },
  { date: "2026-10-29", hour: 14, minute: 0,  name: "FOMC Decision", tier: "high", windowMins: 10 },
  { date: "2026-10-30", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── November 2026 ─────────────────────────────────────────────────────────
  { date: "2026-11-06", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-11-12", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-11-13", hour: 8,  minute: 30, name: "PPI",           tier: "med",  windowMins: 3 },
  { date: "2026-11-28", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
  // ── December 2026 ─────────────────────────────────────────────────────────
  { date: "2026-12-04", hour: 8,  minute: 30, name: "NFP",           tier: "high", windowMins: 5 },
  { date: "2026-12-10", hour: 8,  minute: 30, name: "CPI",           tier: "high", windowMins: 5 },
  { date: "2026-12-11", hour: 8,  minute: 30, name: "FOMC Decision", tier: "high", windowMins: 10 },
  { date: "2026-12-18", hour: 8,  minute: 30, name: "PCE",           tier: "high", windowMins: 5 },
];

/**
 * Check whether a given moment (ET) falls inside a news window.
 * Returns the blocking event if active, or null if clear.
 */
export function checkNewsWindow(nowET: Date): { blocked: boolean; event: NewsEvent | null; minutesUntil: number | null } {
  const y = nowET.getFullYear();
  const m = String(nowET.getMonth() + 1).padStart(2, "0");
  const d = String(nowET.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const nowMin = nowET.getHours() * 60 + nowET.getMinutes();

  // Check if inside any window
  for (const ev of NEWS_CALENDAR) {
    if (ev.date !== todayStr) continue;
    const evMin = ev.hour * 60 + ev.minute;
    const diff = nowMin - evMin; // positive = past, negative = before
    if (diff >= -ev.windowMins && diff <= ev.windowMins) {
      return { blocked: true, event: ev, minutesUntil: null };
    }
  }

  // Find soonest upcoming event today (within next 60 min)
  for (const ev of NEWS_CALENDAR) {
    if (ev.date !== todayStr) continue;
    const evMin = ev.hour * 60 + ev.minute;
    const minsTo = evMin - nowMin;
    if (minsTo > 0 && minsTo <= 60) {
      return { blocked: false, event: ev, minutesUntil: minsTo };
    }
  }

  return { blocked: false, event: null, minutesUntil: null };
}

/**
 * Get all news events for a given date string (YYYY-MM-DD).
 */
export function getEventsForDate(dateStr: string): NewsEvent[] {
  return NEWS_CALENDAR.filter((e) => e.date === dateStr);
}

// ────────────────────────────────────────────────────────────────────────────
// TRADE & CSV
// ────────────────────────────────────────────────────────────────────────────
export type Trade = {
  id: number; day: number; date: string; hour: number; instrument: string;
  setup: string; dir: string; size: number; risk: number; R: number; pnl: number; revenge: boolean;
};

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateJournal(): Trade[] {
  const rnd = mulberry32(20260530);
  const SETUPS: Record<string, { hours: number[]; wr: number; win: number; loss: number; baseRisk: number; inst: string[] }> = {
    ORB:         { hours: [9, 10],     wr: 0.57, win: 1.9, loss: 1.0, baseRisk: 100, inst: ["NQ", "MNQ"] },
    "Trend Pull": { hours: [11, 12],  wr: 0.49, win: 1.5, loss: 1.0, baseRisk: 100, inst: ["MNQ", "MES"] },
    Reversal:    { hours: [13, 14, 15], wr: 0.39, win: 1.3, loss: 1.05, baseRisk: 100, inst: ["MNQ", "MGC"] },
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

export const CSV_TEMPLATE = "date,hour,instrument,setup,dir,size,pnl\n2026-06-09,9,NQ,ORB,Long,1,180\n2026-06-09,13,MNQ,Reversal,Short,2,-160\n";

// ────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ────────────────────────────────────────────────────────────────────────────
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
      let cum = 0; let cumWithout = 0;
      let hitWith = false; let hitWithout = false;
      day.forEach((t) => { cum += t.pnl; if (cum <= -1000) hitWith = true; });
      day.filter((t) => !t.revenge).forEach((t) => { cumWithout += t.pnl; if (cumWithout <= -1000) hitWithout = true; });
      if (hitWith && !hitWithout) blown++;
    });
    sigs.push({
      name: "Revenge sizing after losses", sev: mult >= 2 ? "high" : "med",
      desc: `After a losing trade you size up to <b>${mult.toFixed(1)}×</b> normal and chase. These trades carry negative expectancy of <b>$${revExp.exp.toFixed(0)}</b> each — and on <b>${blown}</b> day(s) a revenge trade is what breached the daily limit.`,
      stats: [["+" + rev.length, "revenge trades"], ["$" + revExp.sum.toFixed(0), "total P&L"], [blown, "days it cost you"]],
      score: Math.abs(revExp.sum) + blown * 800,
    });
  }
  const hAgg = groupBy(trades, (t) => hourBucket(t.hour)).sort((a, b) => a.exp - b.exp);
  const worst = hAgg[0];
  if (worst && worst.exp < 0) {
    sigs.push({
      name: "Time-of-day tilt window", sev: worst.exp < -30 ? "high" : "med",
      desc: `Your <b>${worst.key}</b> block is your weakest window: <b>${(worst.winRate * 100).toFixed(0)}%</b> win rate and <b>$${worst.exp.toFixed(0)}</b> expectancy/trade across ${worst.n} trades.`,
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
      desc: `On losing days you take <b>${redAvg.toFixed(1)}</b> trades vs <b>${greenAvg.toFixed(1)}</b> on green days. Trying to trade your way back extends red days.`,
      stats: [[redAvg.toFixed(1), "trades / red day"], [greenAvg.toFixed(1), "trades / green day"], [red.length, "red days"]],
      score: (redAvg - greenAvg) * 200,
    });
  }
  return sigs.sort((a, b) => b.score - a.score);
}

// ────────────────────────────────────────────────────────────────────────────
// PRE-TRADE FIREWALL
// ────────────────────────────────────────────────────────────────────────────
export type Verdict = "APPROVE" | "REDUCE" | "WAIT" | "BLOCK";
export type AcctState = { todayPnL: number; trailingRoom: number; daysTraded: number };
export type CheckInput = {
  instrument: string;
  size: number;
  stop: number;
  news: boolean;          // manual override: user knows there's a news event
  tilt: boolean;          // user has had 2+ losses today
  newsWindow?: { blocked: boolean; event: NewsEvent | null }; // from checkNewsWindow()
};
export type CheckResult = {
  verdict: Verdict;
  reason: string;
  worstCase: number;
  safeSize: number;
  checks: { l: string; s: "ok" | "warn" | "bad"; v: string }[];
  binding?: number;
};

export function preTradeCheck(firm: Firm, acct: AcctState, trade: CheckInput): CheckResult {
  const inst = INSTRUMENTS[trade.instrument];
  if (!inst) {
    return { verdict: "BLOCK", reason: `Unknown instrument <b>${trade.instrument}</b>.`, worstCase: 0, safeSize: 0, checks: [] };
  }

  const slip = 1.0;
  const worstCase = Math.round(trade.size * inst.perPoint * (trade.stop + slip));
  const checks: CheckResult["checks"] = [];
  let verdict: Verdict = "APPROVE";
  let reason = "";

  const dailyRoom = firm.dailyLoss == null
    ? Infinity
    : Math.max(0, firm.dailyLoss - Math.max(0, -acct.todayPnL));
  const trailingRoom = acct.trailingRoom;
  const binding = Math.min(dailyRoom, trailingRoom);

  // ── 1. Restricted instrument ──────────────────────────────────────────────
  if (firm.restricted.includes(trade.instrument)) {
    return { verdict: "BLOCK", reason: `<b>${trade.instrument}</b> is restricted on ${firm.name}.`, worstCase, safeSize: 0, checks: [{ l: "restricted_instrument", s: "bad", v: "BLOCKED" }] };
  }

  // ── 2. Contract cap (hard block if over) ──────────────────────────────────
  const overCap = trade.size > firm.contractCap;
  checks.push({ l: "contract_cap", s: overCap ? "bad" : "ok", v: `${trade.size}/${firm.contractCap} max` });
  if (overCap) {
    verdict = "REDUCE";
    reason = `Size of <b>${trade.size}</b> exceeds this account's contract cap of <b>${firm.contractCap}</b>. Reduce to cap.`;
  }

  // ── 3. Trailing drawdown room ─────────────────────────────────────────────
  const trailStatus = worstCase <= trailingRoom ? "ok" : "bad";
  checks.push({ l: "trailing_drawdown", s: trailStatus, v: `$${trailingRoom} remaining` });

  // ── 4. Daily loss room ────────────────────────────────────────────────────
  const dllStatus = dailyRoom === Infinity ? "ok" : worstCase <= dailyRoom ? "ok" : "bad";
  checks.push({ l: "daily_loss_limit", s: dllStatus, v: dailyRoom === Infinity ? "no limit" : `$${dailyRoom} left` });

  // ── 5. Combined risk / safe size ──────────────────────────────────────────
  const maxByRoom = binding === Infinity ? trade.size : Math.floor(binding / (inst.perPoint * (trade.stop + slip)));
  const safeSize = Math.min(trade.size, maxByRoom, firm.contractCap);
  const worstOk = worstCase <= binding;
  checks.push({ l: "worst_case_loss", s: worstOk ? "ok" : "bad", v: `$${worstCase} vs $${binding === Infinity ? "∞" : binding} room` });

  // ── 6. News window ────────────────────────────────────────────────────────
  const newsBlocked = trade.news || (trade.newsWindow?.blocked === true);
  const newsEvent = trade.newsWindow?.event;
  if (newsBlocked) {
    checks.push({ l: "news_window", s: "warn", v: newsEvent ? newsEvent.name + " ACTIVE" : "ACTIVE" });
    if (verdict === "APPROVE") { verdict = "WAIT"; reason = `<b>${newsEvent ? newsEvent.name : "News"} window</b> is active — hold until it clears.`; }
  } else {
    checks.push({ l: "news_window", s: "ok", v: "clear" });
  }

  // ── 7. Post-loss cool-down ────────────────────────────────────────────────
  if (trade.tilt) {
    checks.push({ l: "post_loss_cooldown", s: "warn", v: "2 losses today" });
    if (verdict === "APPROVE") { verdict = "WAIT"; reason = "You are <b>2 losses deep today</b> — mandatory cool-down active."; }
  } else {
    checks.push({ l: "post_loss_cooldown", s: "ok", v: "clear" });
  }

  // ── 8. Drawdown type warning for intraday firms ───────────────────────────
  if (firm.drawdownType === "intraday_trailing" && trailingRoom < firm.trailingDD * 0.3) {
    checks.push({ l: "drawdown_type_risk", s: "warn", v: "intraday trailing — <30% buffer" });
  }

  // ── Final verdict ─────────────────────────────────────────────────────────
  if (verdict === "APPROVE") {
    if (safeSize <= 0 || !worstOk) {
      verdict = "BLOCK";
      reason = `Worst-case loss <b>$${worstCase}</b> exceeds your remaining room of <b>$${binding === Infinity ? "∞" : binding}</b>. No safe size — protect the account.`;
    } else if (safeSize < trade.size) {
      verdict = "REDUCE";
      reason = `At ${trade.size} contracts, worst-case is <b>$${worstCase}</b> — over your <b>$${binding}</b> room. Largest safe size is <b>${safeSize}</b>.`;
    } else {
      reason = `Within every limit. Worst-case <b>$${worstCase}</b> against <b>$${binding === Infinity ? "∞" : "$" + binding}</b> of room. Cleared.`;
    }
  }

  return { verdict, reason, worstCase, safeSize, checks, binding };
}

export function fmtMoney(n: number): string {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
}

// ────────────────────────────────────────────────────────────────────────────
// MONTE CARLO
// ────────────────────────────────────────────────────────────────────────────
export type MonteCarloResult = {
  blow: number; survive: number; pass: number;
  paths: number[][];
  p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[];
  nTrades: number;
};

export function monteCarlo(trades: Trade[], trailingDD: number, nSim = 500, nTrades = 80, nSamplePaths = 60): MonteCarloResult {
  const empty = (): number[] => new Array(nTrades).fill(0);
  if (trades.length < 3) return { blow: 0, survive: 1, pass: 0, paths: [], p10: empty(), p25: empty(), p50: empty(), p75: empty(), p90: empty(), nTrades };
  const rnd = mulberry32(42);
  const pnls = trades.map((t) => t.pnl);
  const n = pnls.length;
  const matrix: number[][] = [];
  let blowCount = 0, passCount = 0;
  for (let s = 0; s < nSim; s++) {
    let eq = 0, peak = 0, blown = false;
    const row: number[] = new Array(nTrades).fill(0);
    for (let t = 0; t < nTrades; t++) {
      eq += pnls[Math.floor(rnd() * n)];
      if (eq > peak) peak = eq;
      if (!blown && peak - eq >= trailingDD) blown = true;
      row[t] = eq;
    }
    if (blown) blowCount++;
    else if (eq > 0) passCount++;
    matrix.push(row);
  }
  const blow = blowCount / nSim, pass = passCount / nSim, survive = 1 - blow;
  const p10: number[] = empty(), p25: number[] = empty(), p50: number[] = empty(), p75: number[] = empty(), p90: number[] = empty();
  for (let t = 0; t < nTrades; t++) {
    const col = matrix.map((r) => r[t]).sort((a, b) => a - b);
    p10[t] = col[Math.floor(nSim * 0.10)];
    p25[t] = col[Math.floor(nSim * 0.25)];
    p50[t] = col[Math.floor(nSim * 0.50)];
    p75[t] = col[Math.floor(nSim * 0.75)];
    p90[t] = col[Math.floor(nSim * 0.90)];
  }
  const step = Math.max(1, Math.floor(nSim / nSamplePaths));
  const paths: number[][] = [];
  for (let i = 0; i < nSim && paths.length < nSamplePaths; i += step) paths.push(matrix[i]);
  return { blow, survive, pass, paths, p10, p25, p50, p75, p90, nTrades };
}

// ────────────────────────────────────────────────────────────────────────────
// FUNDED SCORE (0–100 composite)
// ────────────────────────────────────────────────────────────────────────────
export function fundedScore(trades: Trade[]): number {
  if (!trades.length) return 0;
  const stat = expectancy(trades);
  const avgRisk = trades.reduce((a, t) => a + t.risk, 0) / trades.length || 100;
  const edgeScore = Math.min(40, Math.max(0, (stat.exp / avgRisk) * 40));
  const wrScore = Math.min(25, Math.max(0, ((stat.winRate - 0.30) / 0.35) * 25));
  const revPct = trades.filter((t) => t.revenge).length / trades.length;
  const discScore = Math.max(0, 25 * (1 - revPct / 0.20));
  const volScore = Math.min(10, (trades.length / 50) * 10);
  return Math.round(Math.min(100, Math.max(0, edgeScore + wrScore + discScore + volScore)));
}
