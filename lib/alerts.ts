// Alert rules engine: turns profile + news into actionable alerts,
// with de-dupe so notifications don't spam.
import { type Profile } from "./profile";
import { assessAccount } from "./risk";
import { usd } from "./format";

export type Alert = {
  id: string;            // stable id for de-dupe
  severity: "danger" | "warn" | "info";
  title: string;
  body: string;
};

export function evaluateAlerts(profile: Profile, news: { title: string; date: string }[]): Alert[] {
  const out: Alert[] = [];
  const day = new Date().toISOString().slice(0, 10);

  for (const a of profile.accounts) {
    const r = assessAccount(a);
    if (r.status === "breached") {
      out.push({ id: `${day}:${a.id}:breached`, severity: "danger", title: `${a.label}: BREACHED`, body: "This account is past its limit. Stop trading it." });
      continue;
    }
    if (r.pctBuffer < 0.2) {
      out.push({ id: `${day}:${a.id}:buffer`, severity: "danger", title: `${a.label}: ${usd(Math.max(0, r.distanceToBreach))} to breach`, body: "Under 20% buffer. Flatten or trade minimum size." });
    }
    const f = r.firm;
    if (f.dailyLoss != null && r.dailyRoom !== Infinity && r.dailyRoom <= f.dailyLoss * 0.2) {
      out.push({ id: `${day}:${a.id}:daily80`, severity: "warn", title: `${a.label}: 80% of daily loss used`, body: `Only ${usd(r.dailyRoom)} of daily room left. One more loser ends the day.` });
    }
    if (profile.settings.dailyLossStop > 0 && a.todayPnL <= -0.8 * profile.settings.dailyLossStop) {
      out.push({ id: `${day}:${a.id}:selfstop`, severity: "warn", title: `${a.label}: near your own stop`, body: `You set a ${usd(profile.settings.dailyLossStop)} daily stop. You're at ${usd(a.todayPnL)}.` });
    }
  }

  const now = Date.now();
  for (const e of news) {
    const t = +new Date(e.date);
    const mins = (t - now) / 60000;
    if (mins > 0 && mins <= 15) {
      out.push({ id: `news:${e.date}:${e.title}`, severity: "warn", title: `News in ${Math.ceil(mins)}m: ${e.title}`, body: "No-trade window approaching. Flatten or sit out." });
    }
  }
  return out;
}

const SEEN = "fundedcore.alerts.seen";
export function unseen(alerts: Alert[]): Alert[] {
  if (typeof window === "undefined") return [];
  let seen: string[] = [];
  try { seen = JSON.parse(window.localStorage.getItem(SEEN) || "[]"); } catch {}
  const fresh = alerts.filter((a) => !seen.includes(a.id));
  if (fresh.length) {
    const next = [...seen, ...fresh.map((a) => a.id)].slice(-200);
    try { window.localStorage.setItem(SEEN, JSON.stringify(next)); } catch {}
  }
  return fresh;
}
