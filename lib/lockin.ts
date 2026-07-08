// Session Lock-In — the "Ulysses pact" guardian. Before the session you PRE-COMMIT to
// limits tighter than your firm's; once armed they can't be loosened mid-tilt (a
// high-friction, cooldown-gated disarm). The app enforces with a hard in-app LOCKDOWN
// when a committed line is crossed. This is the safe, ToS-clean form of prevention:
// FundedCore never auto-trades — it holds you to the rules you set when you were calm.
export type Commitment = {
  armed: boolean;
  armedAt: number;          // ms epoch when locked in
  dailyLossStop: number;    // $ (positive) — stop for the day at -this
  maxTrades: number;        // max trades today
  stopAfterLosses: number;  // stop after N losses in a row
  disarmCooldownMin: number;// friction: minutes before you can disarm
};

export type LockLive = { dayPnl: number; tradesToday: number; consecLosses: number };

export type LockStatus = {
  active: boolean;
  breached: boolean;
  violations: { key: string; label: string; detail: string }[];
  usage: { key: string; label: string; value: string; pct: number; hot: boolean }[];
  canDisarmAt: number;      // ms epoch when disarm becomes allowed
  disarmable: boolean;      // cooldown elapsed
};

export function defaultCommitment(settings: { dailyLossStop?: number; maxTradesPerDay?: number }): Commitment {
  return {
    armed: false, armedAt: 0,
    dailyLossStop: settings.dailyLossStop ?? 500,
    maxTrades: settings.maxTradesPerDay ?? 4,
    stopAfterLosses: 2,
    disarmCooldownMin: 60,
  };
}

export function evalLock(c: Commitment, live: LockLive, now = Date.now()): LockStatus {
  if (!c.armed) return { active: false, breached: false, violations: [], usage: [], canDisarmAt: 0, disarmable: true };
  const violations: LockStatus["violations"] = [];
  if (c.dailyLossStop > 0 && live.dayPnl <= -c.dailyLossStop)
    violations.push({ key: "loss", label: "Daily loss stop hit", detail: `You're at ${fmt(live.dayPnl)} — your line was ${fmt(-c.dailyLossStop)}.` });
  if (c.maxTrades > 0 && live.tradesToday >= c.maxTrades)
    violations.push({ key: "trades", label: "Trade cap reached", detail: `${live.tradesToday} of ${c.maxTrades} trades used.` });
  if (c.stopAfterLosses > 0 && live.consecLosses >= c.stopAfterLosses)
    violations.push({ key: "streak", label: "Loss-streak stop", detail: `${live.consecLosses} losses in a row — you committed to stop at ${c.stopAfterLosses}.` });

  const usage: LockStatus["usage"] = [
    { key: "loss", label: "Daily loss", value: `${fmt(live.dayPnl)} / ${fmt(-c.dailyLossStop)}`, pct: c.dailyLossStop > 0 ? clamp(Math.max(0, -live.dayPnl) / c.dailyLossStop) : 0, hot: live.dayPnl <= -c.dailyLossStop * 0.7 },
    { key: "trades", label: "Trades", value: `${live.tradesToday} / ${c.maxTrades}`, pct: c.maxTrades > 0 ? clamp(live.tradesToday / c.maxTrades) : 0, hot: live.tradesToday >= c.maxTrades - 1 },
    { key: "streak", label: "Loss streak", value: `${live.consecLosses} / ${c.stopAfterLosses}`, pct: c.stopAfterLosses > 0 ? clamp(live.consecLosses / c.stopAfterLosses) : 0, hot: live.consecLosses >= c.stopAfterLosses - 1 },
  ];

  const canDisarmAt = c.armedAt + c.disarmCooldownMin * 60000;
  return { active: true, breached: violations.length > 0, violations, usage, canDisarmAt, disarmable: now >= canDisarmAt };
}

function clamp(n: number) { return Math.max(0, Math.min(1, n)); }
function fmt(n: number) { const s = n < 0 ? "-" : ""; return `${s}$${Math.abs(Math.round(n)).toLocaleString()}`; }
