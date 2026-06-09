// Real-time Tilt & Breach Guard
// A continuous circuit-breaker brain for the live session. Reads today's trades
// + the account and computes a weighted Tilt Index from multiple behavioral
// signals, plus always-on breach / daily-stop proximity. Escalates from calm to
// hard-stop with a specific intervention at each level. Runs off CSV/manual
// logging — no live broker session required (so it won't fight a trading bot).
import type { Trade } from "./score";
import type { Account } from "./risk";
import { assessAccount } from "./risk";
import { analyze } from "./insights";

export type GuardSignal = {
  key: string;
  label: string;
  active: boolean;
  points: number;       // contribution to the tilt index when active
  detail: string;
};

export type GuardLevel = "calm" | "watch" | "elevated" | "stop";

export type GuardState = {
  level: GuardLevel;
  tiltIndex: number;          // 0-100
  headline: string;
  intervention: string;
  locked: boolean;            // true => you should stop trading now
  signals: GuardSignal[];
  breach: { distance: number; pct: number; status: string; binding: string } | null;
  dailyStop: { used: number; limit: number; pct: number } | null;
  today: { trades: number; net: number; consecLosses: number };
};

const LEVEL_HEAD: Record<GuardLevel, string> = {
  calm: "Calm — you're trading clean",
  watch: "Watch — early tilt signals",
  elevated: "Elevated — step back before the next click",
  stop: "Stop — the session is over",
};

export function guardState(
  trades: Trade[],
  account: Account | null,
  opts: { dailyLossStop: number; maxTradesPerDay: number; now?: number },
): GuardState {
  const now = opts.now ?? Date.now();
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const today = trades.filter((t) => t.date === todayKey).sort((a, b) => a.timestamp - b.timestamp);
  const net = today.reduce((s, t) => s + t.pnl, 0);

  let consecLosses = 0;
  for (let i = today.length - 1; i >= 0; i--) { if (today[i].pnl < 0) consecLosses++; else break; }

  // Baseline size from full history (for size-escalation detection).
  const allSizes = trades.map((t) => (t.size != null ? Math.abs(t.size) : 0)).filter((x) => x > 0);
  const baseSize = allSizes.length ? allSizes.reduce((s, x) => s + x, 0) / allSizes.length : 0;

  const signals: GuardSignal[] = [];
  let tilt = 0;

  // 1. Loss streak — the core tilt driver.
  const streakPts = consecLosses >= 3 ? 50 : consecLosses === 2 ? 30 : consecLosses === 1 ? 8 : 0;
  if (streakPts) tilt += streakPts;
  signals.push({
    key: "streak", label: "Loss streak", active: consecLosses >= 2, points: streakPts,
    detail: consecLosses ? `${consecLosses} losing trade${consecLosses === 1 ? "" : "s"} in a row.` : "No active loss streak.",
  });

  // 2. Size escalation after a loss (revenge sizing).
  let sizeUp = false, sizePts = 0;
  if (baseSize > 0 && today.length >= 2) {
    const afterLossSizes: number[] = [];
    for (let i = 1; i < today.length; i++) {
      if (today[i - 1].pnl < 0 && today[i].size != null) afterLossSizes.push(Math.abs(today[i].size!));
    }
    if (afterLossSizes.length) {
      const avg = afterLossSizes.reduce((s, x) => s + x, 0) / afterLossSizes.length;
      if (avg > baseSize * 1.2) { sizeUp = true; sizePts = 18; tilt += sizePts; }
    }
  }
  signals.push({
    key: "sizeup", label: "Sizing up after losses", active: sizeUp, points: sizePts,
    detail: sizeUp ? "You're trading bigger right after losing — the classic tilt tell." : "Size is steady after losses.",
  });

  // 3. Rapid re-entry / pace (clustering trades close together).
  let rapid = false, pacePts = 0;
  if (today.length >= 2) {
    const last = today[today.length - 1];
    const prev = today[today.length - 2];
    const gapMin = (last.timestamp - prev.timestamp) / 60000;
    if (gapMin >= 0 && gapMin < 3) { rapid = true; pacePts = 14; tilt += pacePts; }
  }
  signals.push({
    key: "pace", label: "Rapid re-entry", active: rapid, points: pacePts,
    detail: rapid ? "Trades firing <3 min apart — you're not waiting for setups." : "Trade pacing looks deliberate.",
  });

  // 4. Daily-stop proximity.
  let dailyStop: GuardState["dailyStop"] = null;
  if (opts.dailyLossStop > 0) {
    const used = Math.max(0, -net);
    const pct = Math.min(1, used / opts.dailyLossStop);
    dailyStop = { used, limit: opts.dailyLossStop, pct };
    const dsPts = pct >= 1 ? 30 : Math.round(pct * 24);
    tilt += dsPts;
    signals.push({
      key: "dailystop", label: "Daily-stop proximity", active: pct >= 0.6, points: dsPts,
      detail: pct >= 1 ? `Down $${Math.round(used)} — at your $${opts.dailyLossStop} stop.` : `Used ${Math.round(pct * 100)}% of your daily-loss stop.`,
    });
  }

  // 5. Breach proximity (binding firm constraint).
  let breach: GuardState["breach"] = null;
  if (account) {
    const ar = assessAccount(account);
    breach = { distance: ar.distanceToBreach, pct: Math.max(0, Math.min(1, ar.pctBuffer)), status: ar.status, binding: ar.bindingConstraint };
    const bpts = ar.status === "breached" ? 40 : ar.status === "danger" ? 30 : ar.status === "caution" ? 14 : 0;
    tilt += bpts;
    signals.push({
      key: "breach", label: "Breach proximity", active: ar.status === "danger" || ar.status === "breached", points: bpts,
      detail: ar.status === "breached" ? "Account is breached." : `$${Math.round(ar.distanceToBreach)} to breach (${ar.bindingConstraint} constraint).`,
    });
  }

  // 6. Over trade cap.
  const overCap = opts.maxTradesPerDay > 0 && today.length >= opts.maxTradesPerDay;
  const capPts = overCap ? 20 : 0;
  if (overCap) tilt += capPts;
  signals.push({
    key: "cap", label: "Trade cap", active: overCap, points: capPts,
    detail: overCap ? `${today.length} trades — past your cap of ${opts.maxTradesPerDay}.` : `${today.length} of ${opts.maxTradesPerDay || "∞"} trades today.`,
  });

  // 7. Trading your historically worst hour right now.
  let worstHour = false, whPts = 0;
  const ins = analyze(trades);
  const hourKey = String(new Date(now).getUTCHours()).padStart(2, "0") + ":00";
  if (ins.worstWindow && ins.worstWindow.key === hourKey && ins.worstWindow.net < 0) {
    worstHour = true; whPts = 10; tilt += whPts;
  }
  signals.push({
    key: "worsthour", label: "Worst-hour window", active: worstHour, points: whPts,
    detail: worstHour ? `It's ${hourKey} UTC — historically your worst, weakest window.` : "Not in a historically bad window.",
  });

  tilt = Math.max(0, Math.min(100, Math.round(tilt)));

  // Hard locks override the index.
  const hitDailyStop = dailyStop != null && dailyStop.pct >= 1;
  const breached = breach != null && breach.status === "breached";
  const danger = breach != null && breach.status === "danger";

  let level: GuardLevel;
  if (hitDailyStop || breached || overCap || consecLosses >= 3 || tilt >= 70) level = "stop";
  else if (danger || tilt >= 45) level = "elevated";
  else if (tilt >= 20) level = "watch";
  else level = "calm";

  const locked = level === "stop";

  const intervention =
    level === "stop"
      ? (hitDailyStop ? "You hit the daily stop you set. Close the platform — protecting tomorrow is the trade now."
        : breached ? "The account is breached. Nothing good happens from here today."
        : overCap ? "You're past your trade cap. Your highest-volume days are your worst. Done for today."
        : consecLosses >= 3 ? "Three losses deep. This is exactly where revenge wrecks accounts. Walk away for the day."
        : "Tilt is maxed. Flatten, stand up, and end the session.")
      : level === "elevated"
      ? "Hands off the mouse for 10 minutes. If you take anything, it must be your A+ setup at reduced size."
      : level === "watch"
      ? "Early warning. Slow down, breathe, and only trade your plan — no improvising."
      : "Green. Keep executing your plan and let the edge work.";

  return {
    level, tiltIndex: tilt, headline: LEVEL_HEAD[level], intervention, locked,
    signals, breach, dailyStop,
    today: { trades: today.length, net, consecLosses },
  };
}
