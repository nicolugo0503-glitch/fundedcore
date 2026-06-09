// Pre-Trade Decision Gate
// Fires the trader's OWN leak / breach / risk engines BEFORE a trade is taken,
// turning post-mortem analytics into a real-time "should I take this?" verdict.
import type { Trade } from "./score";
import { analyze } from "./insights";
import type { Account } from "./risk";
import { assessAccount, maxSizeNow, worstCaseLoss } from "./risk";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type ProposedTrade = {
  symbol: string;
  dow: number;        // 0-6 (UTC day-of-week of planned entry)
  hour: number;       // 0-23 (UTC hour of planned entry)
  size: number;       // contracts
  stopPts: number;    // planned stop distance in points
  tradesToday: number;     // trades already taken today
  pnlToday: number;        // realized P&L so far today ($)
  consecutiveLosses: number; // losing trades in a row right now
};

export type GateReason = {
  kind: "block" | "warn" | "ok";
  title: string;
  detail: string;
  cost?: number;      // historical $ tied to this pattern
};

export type GateVerdict = {
  verdict: "GO" | "CAUTION" | "SKIP";
  score: number;            // 0-100 confidence to take it
  reasons: GateReason[];
  size: { proposed: number; max: number; suggested: number };
  summary: string;
};

function fmt(n: number) {
  const s = n < 0 ? "-" : "";
  return s + "$" + Math.abs(Math.round(n)).toLocaleString();
}
function pct(n: number) { return Math.round(n * 100) + "%"; }

export function gateCheck(
  trades: Trade[],
  p: ProposedTrade,
  opts: { maxTradesPerDay: number; dailyLossStop: number; account?: Account | null },
): GateVerdict {
  const reasons: GateReason[] = [];
  let score = 72;            // start mildly positive
  let hardBlock = false;
  const ins = analyze(trades);

  // ── 1. Self-imposed daily loss stop already hit ──────────────────────────
  if (opts.dailyLossStop > 0 && p.pnlToday <= -Math.abs(opts.dailyLossStop)) {
    reasons.push({
      kind: "block",
      title: "Daily loss stop hit",
      detail: `You're down ${fmt(p.pnlToday)} today — at or past your ${fmt(-Math.abs(opts.dailyLossStop))} stop. The day is over. Protect tomorrow.`,
      cost: -p.pnlToday,
    });
    hardBlock = true;
  }

  // ── 2. Overtrading / max trades per day ──────────────────────────────────
  if (opts.maxTradesPerDay > 0 && p.tradesToday >= opts.maxTradesPerDay) {
    reasons.push({
      kind: "block",
      title: "Trade cap reached",
      detail: `This is trade #${p.tradesToday + 1}; your cap is ${opts.maxTradesPerDay}. Your highest-volume days are historically your worst. Walk away.`,
    });
    hardBlock = true;
  } else if (opts.maxTradesPerDay > 0 && p.tradesToday === opts.maxTradesPerDay - 1) {
    reasons.push({
      kind: "warn",
      title: "Last trade of the day",
      detail: `This is your final allowed trade (#${p.tradesToday + 1} of ${opts.maxTradesPerDay}). Make it your A+ setup or skip it.`,
    });
    score -= 8;
  }

  // ── 3. Revenge / after-loss pattern ──────────────────────────────────────
  if (p.consecutiveLosses >= 2) {
    const sizedUp = ins.afterLoss.avgSizeMult > 1.15;
    const bleeds = ins.afterLoss.net < 0 && ins.afterLoss.trades >= 3;
    if (bleeds) {
      reasons.push({
        kind: p.consecutiveLosses >= 3 ? "block" : "warn",
        title: "Revenge-trade zone",
        detail: `You're ${p.consecutiveLosses} losses deep. Your trades right after a loss have lost ${fmt(ins.afterLoss.net)} historically` +
          (sizedUp ? `, and you size them ${Math.round((ins.afterLoss.avgSizeMult - 1) * 100)}% bigger — exactly the wrong move.` : ".") +
          ` Step away 10 minutes.`,
        cost: -ins.afterLoss.net,
      });
      if (p.consecutiveLosses >= 3) hardBlock = true; else score -= 22;
    } else {
      reasons.push({
        kind: "warn",
        title: `${p.consecutiveLosses} losses in a row`,
        detail: `Tilt risk is high after consecutive losses. Re-check that this is a real setup, not a get-it-back trade.`,
      });
      score -= 12;
    }
  }

  // ── 4. Account breach risk (if a live/selected account is provided) ───────
  if (opts.account) {
    const ar = assessAccount(opts.account);
    const risk = worstCaseLoss(p.symbol, p.size, p.stopPts);
    const room = ar.distanceToBreach;          // $ to breach
    const maxSz = maxSizeNow(opts.account, p.symbol, p.stopPts);
    if (room > 0 && risk >= room) {
      reasons.push({
        kind: "block",
        title: "This trade can breach the account",
        detail: `Worst-case loss at your stop is ${fmt(risk)}, but you're only ${fmt(room)} from breach. One stop-out ends the account.`,
        cost: risk,
      });
      hardBlock = true;
    } else if (room > 0 && risk >= room * 0.5) {
      reasons.push({
        kind: "warn",
        title: "Heavy heat vs. breach buffer",
        detail: `This risks ${fmt(risk)} of your ${fmt(room)} remaining buffer (${pct(risk / room)}). One bad trade and you're on the edge.`,
        cost: risk,
      });
      score -= 16;
    }
    if (maxSz > 0 && p.size > maxSz) {
      reasons.push({
        kind: "warn",
        title: "Oversized for this account",
        detail: `Max safe size here at a ${p.stopPts}pt stop is ${maxSz} contract${maxSz === 1 ? "" : "s"} — you entered ${p.size}.`,
      });
      score -= 10;
    }
  }

  // ── 5. Edge by instrument / day / hour (the trader's own history) ─────────
  const sym = ins.bySymbol.find((b) => b.key === p.symbol);
  if (sym && sym.trades >= 4) {
    if (sym.expectancy < 0) {
      reasons.push({
        kind: "warn",
        title: `${p.symbol} is a losing instrument for you`,
        detail: `${fmt(sym.net)} net over ${sym.trades} trades (${pct(sym.winRate)} win rate). The data says this isn't your edge.`,
        cost: -sym.net,
      });
      score -= 14;
    } else if (sym.expectancy > 0) {
      reasons.push({
        kind: "ok",
        title: `${p.symbol} is in your wheelhouse`,
        detail: `${fmt(sym.net)} net, ${pct(sym.winRate)} win rate over ${sym.trades} trades. This is an instrument you trade well.`,
      });
      score += 6;
    }
  }

  const day = ins.byDay.find((b) => b.key === DOW[p.dow]);
  if (day && day.trades >= 4) {
    if (day.net < 0) {
      reasons.push({
        kind: "warn",
        title: `${DOW[p.dow]} is a weak day for you`,
        detail: `${pct(day.winRate)} win rate on ${DOW[p.dow]}s, ${fmt(day.net)} net across ${day.trades} trades.`,
        cost: -day.net,
      });
      score -= 12;
    } else if (day.net > 0) {
      reasons.push({ kind: "ok", title: `${DOW[p.dow]}s work for you`, detail: `${fmt(day.net)} net, ${pct(day.winRate)} win rate.` });
      score += 4;
    }
  }

  const hourKey = String(p.hour).padStart(2, "0") + ":00";
  const hr = ins.byHour.find((b) => b.key === hourKey);
  if (hr && hr.trades >= 3) {
    const isWorst = ins.worstWindow && ins.worstWindow.key === hourKey;
    const isBest = ins.bestWindow && ins.bestWindow.key === hourKey;
    if (isWorst && hr.net < 0) {
      reasons.push({
        kind: "warn",
        title: `${hourKey} UTC is your worst hour`,
        detail: `${fmt(hr.net)} net over ${hr.trades} trades in this window. Consistently your weakest time.`,
        cost: -hr.net,
      });
      score -= 14;
    } else if (isBest && hr.net > 0) {
      reasons.push({ kind: "ok", title: `${hourKey} UTC is your best window`, detail: `${fmt(hr.net)} net, ${pct(hr.winRate)} win rate. Prime time.` });
      score += 8;
    } else if (hr.net < 0) {
      reasons.push({ kind: "warn", title: `${hourKey} UTC runs negative`, detail: `${fmt(hr.net)} net over ${hr.trades} trades this hour.`, cost: -hr.net });
      score -= 6;
    }
  }

  // No data yet — be honest rather than fake a verdict.
  if (ins.totals.trades < 10) {
    reasons.push({
      kind: "warn",
      title: "Thin history",
      detail: `Only ${ins.totals.trades} trades on file — the gate can't read your edge reliably yet. Verdict is provisional. Upload more history.`,
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let verdict: GateVerdict["verdict"];
  if (hardBlock) { verdict = "SKIP"; score = Math.min(score, 20); }
  else if (score < 45 || reasons.some((r) => r.kind === "warn" && (r.cost || 0) > 0 && reasons.filter((x) => x.kind === "warn").length >= 3)) verdict = "CAUTION";
  else if (score < 62) verdict = "CAUTION";
  else verdict = "GO";

  const maxSz = opts.account ? maxSizeNow(opts.account, p.symbol, p.stopPts) : 0;
  const blockReasons = reasons.filter((r) => r.kind === "block").length;
  const warnReasons = reasons.filter((r) => r.kind === "warn").length;
  const summary =
    verdict === "SKIP"
      ? (blockReasons ? "Don't take this trade. " : "The odds are stacked against this one. ") +
        (reasons.find((r) => r.kind === "block")?.title || reasons.find((r) => r.kind === "warn")?.title || "")
      : verdict === "CAUTION"
      ? `Take it only if it's textbook. ${warnReasons} caution flag${warnReasons === 1 ? "" : "s"} on this setup.`
      : "Clean setup against your history. If the entry's there, take it with your plan.";

  return {
    verdict, score, reasons,
    size: { proposed: p.size, max: maxSz, suggested: maxSz > 0 ? Math.min(p.size, maxSz) : p.size },
    summary,
  };
}
