"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../Icon";

export type Command = { id: string; label: string; section?: string; icon?: string; run: () => void };

export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); setQ(""); setI(0); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => c.label.toLowerCase().includes(s) || (c.section || "").toLowerCase().includes(s)) : commands;
  }, [q, commands]);

  useEffect(() => { if (i >= filtered.length) setI(0); }, [filtered, i]);

  if (!open) return null;
  const exec = (c: Command) => { setOpen(false); c.run(); };

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk fade" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <Icon name="spark" size={16} className="text-t3" />
          <input autoFocus className="cmdk-input" placeholder="Jump to a module or run an action…" value={q}
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((p) => Math.min(filtered.length - 1, p + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setI((p) => Math.max(0, p - 1)); }
              else if (e.key === "Enter" && filtered[i]) exec(filtered[i]);
            }} />
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-1.5">
          {filtered.length === 0 && <div className="px-4 py-7 text-center text-t3 text-sm">No matches for “{q}”</div>}
          {filtered.map((c, idx) => (
            <div key={c.id} className={`cmdk-item ${idx === i ? "on" : ""}`} onMouseEnter={() => setI(idx)} onClick={() => exec(c)}>
              {c.icon && <Icon name={c.icon} size={16} />}
              <span className="flex-1 text-[.9rem]">{c.label}</span>
              {c.section && <span className="text-[.66rem] text-t3 uppercase tracking-wide">{c.section}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 text-[.66rem] text-t3" style={{ borderTop: "1px solid var(--line)" }}>
          <span><span className="cmdk-kbd">↑↓</span> navigate</span>
          <span><span className="cmdk-kbd">↵</span> open</span>
          <span><span className="cmdk-kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
