// FundedCore — firm rule-sets, instruments, and the pre-trade firewall.
// Recovered and adapted from the original risk engine. Verified rule snapshots;
// always confirm specifics with your firm. Not financial advice.

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

export type Verdict = "APPROVE" | "REDUCE" | "WAIT" | "BLOCK";
export type AcctState = { todayPnL: number; trailingRoom: number; daysTraded: number };
export type CheckInput = {
  instrument: string;
  size: number;
  stop: number;
  news: boolean;          // manual override: user knows there's a news event
  tilt: boolean;          // user has had 2+ losses today
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
  const newsBlocked = trade.news;
  if (newsBlocked) {
    checks.push({ l: "news_window", s: "warn", v: "ACTIVE" });
    if (verdict === "APPROVE") { verdict = "WAIT"; reason = `<b>News window</b> is active — hold until it clears.`; }
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
