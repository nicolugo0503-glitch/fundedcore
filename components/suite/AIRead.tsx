"use client";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";

// Drop-in AI interpretation panel. Sends a module's computed facts to /api/explain
// and renders a plain-English read. Caches per session so it doesn't re-bill.
export function AIRead({ module, facts }: { module: string; facts: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facts || !facts.trim()) { setLoading(false); return; }
    let alive = true; setLoading(true); setText(null);
    const ck = "airead:" + module + ":" + facts.slice(0, 240);
    try { const c = sessionStorage.getItem(ck); if (c) { setText(c); setLoading(false); return; } } catch {}
    fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module, facts }) })
      .then((r) => r.json()).then((d) => { if (!alive) return; setText(d.text || ""); setLoading(false); try { if (d.text) sessionStorage.setItem(ck, d.text); } catch {} })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [module, facts]);

  if (!facts || !facts.trim()) return null;
  return (
    <div className="card p-4 rise" style={{ borderColor: "color-mix(in srgb, var(--acc) 26%, var(--line2))" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}><Icon name="brain" size={13} /></span>
        <span className="lbl mb-0">AI read</span>
      </div>
      {loading && !text ? <div className="space-y-1.5"><div className="skeleton" style={{ height: 11, width: "92%" }} /><div className="skeleton" style={{ height: 11, width: "78%" }} /></div>
        : <p className="text-[.88rem] text-t1 leading-relaxed">{text || "—"}</p>}
    </div>
  );
}
