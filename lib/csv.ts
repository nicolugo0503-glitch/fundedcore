// ─────────────────────────────────────────────────────────────────────────────
// Flexible trade-history CSV parser.
// Maps common broker / journal export columns to FundedCore's normalized Trade.
// Minimum viable input: a P&L column + a date column. Everything else is bonus.
// ─────────────────────────────────────────────────────────────────────────────
import type { Trade } from "./score";

const PNL_KEYS = ["pnl", "p/l", "p&l", "netpnl", "net", "profit", "realizedpnl", "realized", "gain", "result", "netprofit", "pl"];
const DATE_KEYS = ["date", "closedate", "closetime", "exittime", "exitdate", "time", "datetime", "closed", "opentime", "opendate"];
const SYMBOL_KEYS = ["symbol", "ticker", "instrument", "market", "contract", "asset", "pair"];
const SIDE_KEYS = ["side", "direction", "type", "position", "buysell", "longshort"];
const SIZE_KEYS = ["size", "qty", "quantity", "contracts", "lots", "shares", "volume", "units"];
const R_KEYS = ["r", "rmultiple", "rmult", "rr", "rrealized"];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === "," && !q) {
      out.push(cur); cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string): number {
  if (raw == null) return NaN;
  let s = raw.trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); } // (123.45) = negative
  s = s.replace(/[$,\s]/g, "").replace(/%$/, "");
  const v = parseFloat(s);
  if (isNaN(v)) return NaN;
  return neg ? -v : v;
}

function findKey(headers: string[], candidates: string[]): number {
  const normed = headers.map(norm);
  // exact match first
  for (const c of candidates) {
    const i = normed.indexOf(c);
    if (i >= 0) return i;
  }
  // contains match
  for (let i = 0; i < normed.length; i++)
    for (const c of candidates) if (normed[i].includes(c)) return i;
  return -1;
}

export type ParseResult = {
  trades: Trade[];
  warnings: string[];
  mapped: { pnl?: string; date?: string; symbol?: string; side?: string; size?: string };
};

export function parseTradesCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (lines.length < 2) {
    return { trades: [], warnings: ["File looks empty or has no data rows."], mapped: {} };
  }
  const headers = splitCsvLine(lines[0]);
  const iPnl = findKey(headers, PNL_KEYS);
  const iDate = findKey(headers, DATE_KEYS);
  const iSym = findKey(headers, SYMBOL_KEYS);
  const iSide = findKey(headers, SIDE_KEYS);
  const iSize = findKey(headers, SIZE_KEYS);
  const iR = findKey(headers, R_KEYS);

  if (iPnl < 0) {
    return {
      trades: [],
      warnings: [
        "Couldn't find a profit/loss column. Expected a header like 'PnL', 'Net', 'Profit', or 'P/L'.",
      ],
      mapped: {},
    };
  }

  const trades: Trade[] = [];
  let dropped = 0;
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const pnl = toNumber(cells[iPnl]);
    if (isNaN(pnl)) { dropped++; continue; }

    let timestamp = NaN;
    let date = "";
    if (iDate >= 0 && cells[iDate]) {
      const d = new Date(cells[iDate]);
      if (!isNaN(d.getTime())) {
        timestamp = d.getTime();
        date = d.toISOString().slice(0, 10);
      }
    }
    if (isNaN(timestamp)) {
      // No usable date — synthesize a sequential daily timeline so ordering/DD still work.
      timestamp = Date.UTC(2025, 0, 1) + (r - 1) * 3600_000;
      date = new Date(timestamp).toISOString().slice(0, 10);
    }

    const sideRaw = iSide >= 0 ? (cells[iSide] || "").toLowerCase() : "";
    const side = /s|sell|short/.test(sideRaw) && !/buy|long/.test(sideRaw) ? "short" : sideRaw ? "long" : undefined;
    const size = iSize >= 0 ? Math.abs(toNumber(cells[iSize])) : undefined;
    const rMultiple = iR >= 0 ? toNumber(cells[iR]) : undefined;

    trades.push({
      id: trades.length + 1,
      date,
      timestamp,
      pnl,
      symbol: iSym >= 0 ? cells[iSym] || undefined : undefined,
      side,
      size: size != null && !isNaN(size) ? size : undefined,
      rMultiple: rMultiple != null && !isNaN(rMultiple) ? rMultiple : undefined,
    });
  }

  if (iDate < 0) warnings.push("No date column found — used row order as the timeline.");
  if (dropped > 0) warnings.push(`Skipped ${dropped} row(s) with no readable P&L value.`);
  if (trades.length < 20) warnings.push(`Only ${trades.length} trades parsed — scores under ~30 trades carry low confidence.`);

  return {
    trades,
    warnings,
    mapped: {
      pnl: headers[iPnl],
      date: iDate >= 0 ? headers[iDate] : undefined,
      symbol: iSym >= 0 ? headers[iSym] : undefined,
      side: iSide >= 0 ? headers[iSide] : undefined,
      size: iSize >= 0 ? headers[iSize] : undefined,
    },
  };
}

// A clean template users can download to format their own history.
export const CSV_TEMPLATE =
  "date,symbol,side,size,pnl\n" +
  "2025-01-06,MNQ,long,2,180\n" +
  "2025-01-06,MNQ,long,2,-95\n" +
  "2025-01-07,ES,short,1,240\n" +
  "2025-01-08,MNQ,long,3,-120\n" +
  "2025-01-08,MES,long,4,310\n";
