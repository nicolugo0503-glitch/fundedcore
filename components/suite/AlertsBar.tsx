"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import { evaluateAlerts, unseen, type Alert } from "../../lib/alerts";

const SEV: Record<string, string> = { danger: "#EF4444", warn: "#F59E0B", info: "#3B82F6" };

export function AlertsBar({ profile }: { profile: Profile }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [perm, setPerm] = useState<string>("default");
  const newsRef = useRef<{ title: string; date: string }[]>([]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    fetch("/api/news").then((r) => r.json()).then((d) => { newsRef.current = d.events || []; tick(); }).catch(() => tick());
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tick(); /* re-evaluate when profile changes */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function tick() {
    const all = evaluateAlerts(profile, newsRef.current);
    setAlerts(all);
    const fresh = unseen(all);
    if (fresh.length && typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const a of fresh.slice(0, 3)) {
        try { new Notification("FundedCore — " + a.title, { body: a.body, icon: "/icon-192.png" }); } catch {}
      }
    }
  }

  async function enable() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") { try { new Notification("FundedCore alerts on", { body: "We'll warn you before you breach, before news, and at your stop." }); } catch {} }
  }

  const visible = alerts.filter((a) => !dismissed.includes(a.id));

  return (
    <div className="space-y-2 mb-4">
      {perm === "default" && (
        <button onClick={enable} className="w-full card px-4 py-2.5 text-left text-[.85rem] text-t2 hover:border-acc/40 transition flex items-center justify-between">
          <span>🔔 Turn on alerts — get warned <span className="text-t1">before</span> you breach, before news, at your stop.</span>
          <span className="text-acc text-sm shrink-0 ml-3">Enable →</span>
        </button>
      )}
      {visible.map((a) => (
        <div key={a.id} className="card px-4 py-3 flex items-start justify-between gap-3" style={{ borderColor: SEV[a.severity] + "66", background: SEV[a.severity] + "0d" }}>
          <div>
            <div className="font-semibold text-[.9rem]" style={{ color: SEV[a.severity] }}>{a.title}</div>
            <div className="text-[.8rem] text-t2 mt-0.5">{a.body}</div>
          </div>
          <button className="text-t3 hover:text-t1 shrink-0" onClick={() => setDismissed((d) => [...d, a.id])}>✕</button>
        </div>
      ))}
    </div>
  );
}
