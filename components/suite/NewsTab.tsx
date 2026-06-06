"use client";
import { useEffect, useState } from "react";
import { SuiteHeader } from "./ui";

type Ev = { title: string; country: string; impact: string; date: string; forecast?: string; previous?: string };

export function NewsTab() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [source, setSource] = useState("");
  useEffect(() => {
    fetch("/api/news").then((r) => r.json()).then((d) => { setEvents(d.events || []); setSource(d.source || ""); }).catch(() => setEvents([]));
  }, []);

  const now = Date.now();
  const sorted = (events || []).slice().sort((a, b) => +new Date(a.date) - +new Date(b.date)).filter((e) => +new Date(e.date) > now - 7200000);

  return (
    <div className="space-y-5 fade">
      <div className="flex items-end justify-between">
        <SuiteHeader eyebrow="News" title="High-impact economic calendar" sub="Don't trade through the print. No-trade windows, flagged before they hit." />
        {source && <span className="chip text-[.7rem]">{source === "live" ? "live feed" : "scheduled"}</span>}
      </div>
      <p className="text-t2 text-sm">Don't enter or hold through a high-impact release. Spreads widen and slippage can breach you. Wait 2–5 minutes after the print.</p>

      {events === null ? <div className="card p-8 text-center text-t3">Loading…</div> : sorted.length === 0 ? (
        <div className="card p-8 text-center text-grn">No upcoming high-impact events. Clear to trade.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((e, i) => {
            const t = +new Date(e.date);
            const mins = Math.round((t - now) / 60000);
            const live = mins <= 5 && mins >= -10;
            const soon = mins > 5 && mins <= 30;
            return (
              <div key={i} className="card p-4 flex items-center justify-between" style={{ borderColor: live ? "#EF444455" : soon ? "#F59E0B44" : undefined }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="chip shrink-0" style={{ borderColor: "#EF444455", color: "#EF4444" }}>HIGH</span>
                  <div className="min-w-0"><div className="font-medium truncate">{e.title}</div>
                    {(e.forecast || e.previous) && <div className="text-[.74rem] text-t3">{e.forecast ? `forecast ${e.forecast}` : ""}{e.previous ? ` · prev ${e.previous}` : ""}</div>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="mono text-sm">{new Date(e.date).toUTCString().slice(17, 22)} UTC</div>
                  <div className="text-[.74rem]" style={{ color: live ? "#EF4444" : soon ? "#F59E0B" : "#64748B" }}>
                    {live ? "NO-TRADE NOW" : mins < 0 ? "passed" : mins < 60 ? `in ${mins}m` : `in ${Math.round(mins / 60)}h`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[.7rem] text-t3">Times in UTC. Always verify against your firm's news policy.</p>
    </div>
  );
}
