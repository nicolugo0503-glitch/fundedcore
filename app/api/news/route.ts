import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FFEvent = {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: "High" | "Medium" | "Low" | "Non-Economic";
  forecast?: string;
  previous?: string;
};

export type LiveEvent = {
  name: string;
  country: string;
  date: string;
  time: string;       // e.g. "8:30am"
  impact: "High" | "Medium";
  forecast?: string;
  previous?: string;
};

export async function GET() {
  try {
    // ForexFactory publishes a public JSON feed for the current week
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "User-Agent": "FundedCore/1.0" },
      // Revalidate once per hour on Vercel Edge Cache
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`ForexFactory returned ${res.status}`);

    const raw: FFEvent[] = await res.json();

    // Keep only high/medium USD events — what funded futures traders care about
    const events: LiveEvent[] = raw
      .filter((e) => e.country === "USD" && (e.impact === "High" || e.impact === "Medium"))
      .map((e) => ({
        name: e.title,
        country: e.country,
        date: e.date,     // e.g. "Jun 11, 2026"
        time: e.time,     // e.g. "8:30am"
        impact: e.impact as "High" | "Medium",
        forecast: e.forecast,
        previous: e.previous,
      }));

    return NextResponse.json({ events, source: "ForexFactory", cached: false });
  } catch (err) {
    // Graceful fallback — dashboard will use static calendar
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { events: [], source: "error", error: msg, cached: false },
      { status: 200 } // 200 so the dashboard doesn't break
    );
  }
}
