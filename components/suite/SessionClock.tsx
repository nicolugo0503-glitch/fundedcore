"use client";
import { useEffect, useState } from "react";

// US equity/futures RTH heuristic in America/New_York.
function nyParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { wd: p.weekday as string, h: +p.hour, m: +p.minute, s: +p.second, label: `${p.hour}:${p.minute}:${p.second}` };
}

export function SessionClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  if (!now) return <span className="chip"><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "var(--t3)" }} /> —</span>;

  const { wd, h, m, label } = nyParts(now);
  const mins = h * 60 + m;
  const weekend = wd === "Sat" || wd === "Sun";
  // Regular cash session 09:30–16:00 ET
  const open = !weekend && mins >= 570 && mins < 960;
  const color = open ? "var(--grn)" : "var(--amb)";
  const text = weekend ? "Market closed" : open ? "NY open" : mins < 570 ? "Pre-market" : "After hours";
  return (
    <span className="chip" title="New York time">
      <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: color }} />
      <span style={{ color }}>{text}</span>
      <span className="mono text-t3 hidden sm:inline">{label} ET</span>
    </span>
  );
}
