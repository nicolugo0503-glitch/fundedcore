// Shared firm rules + risk math (plain JS so both content + popup can use it).
const FC_INSTRUMENTS = {
  MNQ: { perPoint: 2 }, NQ: { perPoint: 20 }, MES: { perPoint: 5 }, ES: { perPoint: 50 },
  MYM: { perPoint: 0.5 }, YM: { perPoint: 5 }, MGC: { perPoint: 10 }, GC: { perPoint: 100 },
  MCL: { perPoint: 10 }, CL: { perPoint: 100 }, M2K: { perPoint: 5 }, RTY: { perPoint: 50 }
};
const FC_FIRMS = {
  topstep50:  { name: "TopStep Combine 50K",  start: 50000,  dailyLoss: 1000, trailingDD: 2000, drawdownType: "intraday_trailing", contractCap: 5 },
  topstep100: { name: "TopStep Combine 100K", start: 100000, dailyLoss: 2000, trailingDD: 3000, drawdownType: "intraday_trailing", contractCap: 10 },
  topstep_xfa50: { name: "TopStep XFA 50K",   start: 50000,  dailyLoss: null, trailingDD: 2000, drawdownType: "eod_trailing", contractCap: 5 },
  apex25: { name: "Apex Eval 25K",  start: 25000,  dailyLoss: 500,  trailingDD: 1000, drawdownType: "eod_trailing", contractCap: 4 },
  apex50: { name: "Apex Eval 50K",  start: 50000,  dailyLoss: 1000, trailingDD: 2000, drawdownType: "eod_trailing", contractCap: 6 },
  apex100:{ name: "Apex Eval 100K", start: 100000, dailyLoss: 2000, trailingDD: 3000, drawdownType: "eod_trailing", contractCap: 10 },
  static50:{ name: "Static 50K (no trail)", start: 50000, dailyLoss: 1100, trailingDD: 2000, drawdownType: "static", contractCap: 10 }
};
function fcFloor(start, peak, firm) {
  if (firm.drawdownType === "static") return start - firm.trailingDD;
  return Math.min(peak - firm.trailingDD, start);
}
function fcAssess(cfg) {
  // cfg: { firmKey, start, balance, peak, todayPnL }
  const firm = FC_FIRMS[cfg.firmKey] || FC_FIRMS.topstep50;
  const start = cfg.start != null ? cfg.start : firm.start;
  const peak = Math.max(cfg.peak != null ? cfg.peak : start, cfg.balance);
  const floor = fcFloor(start, peak, firm);
  const trailingRoom = cfg.balance - floor;
  const dailyRoom = firm.dailyLoss == null ? Infinity : Math.max(0, firm.dailyLoss - Math.max(0, -(cfg.todayPnL || 0)));
  const dtb = Math.min(trailingRoom, dailyRoom);
  const binding = dailyRoom < trailingRoom ? "daily loss" : "trailing DD";
  const pct = firm.trailingDD > 0 ? dtb / firm.trailingDD : 1;
  let status = "healthy";
  if (dtb <= 0) status = "breached";
  else if (pct < 0.2) status = "danger";
  else if (pct < 0.45) status = "caution";
  return { firm, floor, dtb, binding, pct, status, dailyRoom };
}
function fcMaxSize(dtb, instrumentKey, stop, cap) {
  const inst = FC_INSTRUMENTS[instrumentKey] || FC_INSTRUMENTS.MNQ;
  if (dtb <= 0) return 0;
  const per = inst.perPoint * (stop + 1);
  return Math.max(0, Math.min(Math.floor(dtb / per), cap));
}
const FC_STATUS_COLOR = { healthy: "#10B981", caution: "#F59E0B", danger: "#EF4444", breached: "#7F1D1D" };
if (typeof module !== "undefined") module.exports = { FC_FIRMS, FC_INSTRUMENTS, fcAssess, fcMaxSize, FC_STATUS_COLOR };
