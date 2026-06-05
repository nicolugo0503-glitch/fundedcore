// Live high-impact economic calendar. Tries a public feed; falls back to a
// generated upcoming-events set so the app always works. Cached ~30 min.
import { NextResponse } from "next/server";

export const revalidate = 1800;

type Ev = { title: string; country: string; impact: string; date: string; forecast?: string; previous?: string };

const FEED = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export async function GET() {
  try {
    const res = await fetch(FEED, { next: { revalidate: 1800 }, headers: { "User-Agent": "FundedCore/1.0" } });
    if (res.ok) {
      const raw = (await res.json()) as any[];
      const events: Ev[] = raw
        .filter((e) => (e.impact || "").toLowerCase() === "high")
        .map((e) => ({
          title: e.title, country: e.country, impact: "High",
          date: e.date, forecast: e.forecast, previous: e.previous,
        }));
      if (events.length) return NextResponse.json({ source: "live", events: events.slice(0, 40) });
    }
  } catch {
    // fall through to synthetic
  }
  return NextResponse.json({ source: "fallback", events: fallback() });
}

// Synthetic high-impact USD events for the next few weekdays so the UI is never empty.
function fallback(): Ev[] {
  const names = [
    ["CPI m/m", "8:30"], ["Core CPI m/m", "8:30"], ["FOMC Statement", "14:00"],
    ["Non-Farm Employment Change", "8:30"], ["Unemployment Rate", "8:30"],
    ["PPI m/m", "8:30"], ["Retail Sales m/m", "8:30"], ["ISM Manufacturing PMI", "10:00"],
    ["Fed Chair Speaks", "12:30"], ["GDP q/q", "8:30"],
  ];
  const out: Ev[] = [];
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let added = 0, i = 0;
  while (added < 6) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const [nm, hh] = names[i % names.length];
      const [h, m] = hh.split(":").map(Number);
      const ev = new Date(d); ev.setUTCHours(h + 4, m, 0, 0); // ET->UTC approx
      out.push({ title: nm + " (USD)", country: "USD", impact: "High", date: ev.toISOString() });
      added++; i++;
    }
    d = new Date(d.getTime() + 86400000);
  }
  return out;
}
