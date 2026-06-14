"use client";
import { useState } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Nav";

type TabMap = Record<string, { label: string; icon: string }>;
type Group = { label: string; ids: string[] };

const PRIMARY: [string, string][] = [
  ["brief", "Brief"],
  ["gate", "Gate"],
  ["guard", "Guard"],
  ["fundedscore", "Score"],
  ["journal", "Journal"],
];

const CSS = `
.mnav { position:fixed; left:0; right:0; bottom:0; z-index:40; display:flex; padding:6px 4px calc(6px + env(safe-area-inset-bottom));
  background:color-mix(in srgb,var(--bg) 88%,transparent); backdrop-filter:blur(14px); border-top:1px solid var(--line); }
.mnav.hide { display:none; }
@media (min-width:768px){ .mnav { display:none; } }
.mnav button { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 0; color:var(--t3); border-radius:10px; }
.mnav button.on { color:var(--acc); }
.mnav button span { font-size:10px; font-weight:600; letter-spacing:.01em; }
.msheet-scrim { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,.5); animation:mfade .2s ease; }
.msheet { position:fixed; left:0; right:0; bottom:0; z-index:51; max-height:84vh; overflow-y:auto;
  background:var(--bg); border-top-left-radius:20px; border-top-right-radius:20px; border-top:1px solid var(--line2);
  padding:14px 16px calc(20px + env(safe-area-inset-bottom)); animation:mslide .26s cubic-bezier(.2,.8,.2,1); }
@keyframes mslide { from{ transform:translateY(100%);} to{ transform:none; } }
@keyframes mfade { from{opacity:0} to{opacity:1} }
.msheet-grip { width:38px; height:4px; border-radius:3px; background:var(--line2); margin:2px auto 14px; }
.msheet-sec { font-size:.64rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--t3); margin:14px 4px 6px; }
.msheet-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.msheet-item { display:flex; align-items:center; gap:10px; padding:12px 12px; border-radius:12px; border:1px solid var(--line); background:var(--panel); color:var(--t1); font-size:.86rem; font-weight:500; }
.msheet-item.on { border-color:color-mix(in srgb,var(--acc) 45%,transparent); background:var(--acc-weak); color:var(--acc); }
.msheet-foot { display:flex; gap:8px; margin-top:16px; }
.msheet-foot button { flex:1; padding:12px; border-radius:12px; border:1px solid var(--line2); color:var(--t2); font-size:.84rem; font-weight:600; }
`;

export function MobileNav({ tab, setTab, tabMap, groups, onExit, onSignOut, canSignOut, userName, pro }: {
  tab: string; setTab: (id: string) => void; tabMap: TabMap; groups: Group[];
  onExit: () => void; onSignOut?: () => void; canSignOut?: boolean; userName: string; pro?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const PROSET = new Set(["mirror", "edge"]);
  const primaryIds = PRIMARY.map((p) => p[0]);
  const moreActive = !primaryIds.includes(tab);

  function go(id: string) { setTab(id); setOpen(false); window.scrollTo({ top: 0 }); }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className={`mnav ${open ? "hide" : ""}`}>
        {PRIMARY.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => go(id)}>
            <Icon name={tabMap[id]?.icon || "grid"} size={21} />
            <span>{label}</span>
          </button>
        ))}
        <button className={moreActive ? "on" : ""} onClick={() => setOpen(true)}>
          <Icon name="grid" size={21} /><span>More</span>
        </button>
      </nav>

      {open && (
        <>
          <div className="msheet-scrim" onClick={() => setOpen(false)} />
          <div className="msheet">
            <div className="msheet-grip" />
            <div className="flex items-center justify-between mb-1 px-1">
              <Logo size={22} />
              <button onClick={() => setOpen(false)} className="text-t3 p-1"><Icon name="arrow" size={18} className="rotate-90" /></button>
            </div>
            {groups.map((g) => {
              const ids = g.ids.filter((id) => tabMap[id]);
              if (!ids.length) return null;
              return (
                <div key={g.label}>
                  <div className="msheet-sec">{g.label}</div>
                  <div className="msheet-grid">
                    {ids.map((id) => (
                      <button key={id} className={`msheet-item ${tab === id ? "on" : ""}`} onClick={() => go(id)}>
                        <Icon name={tabMap[id].icon} size={17} />{tabMap[id].label}{PROSET.has(id) && !pro && <Icon name="lock" size={13} className="ml-auto opacity-70" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="msheet-sec">Account</div>
            <div className="msheet-grid">
              <button className={`msheet-item ${tab === "settings" ? "on" : ""}`} onClick={() => go("settings")}><Icon name="settings" size={17} />Settings</button>
              <button className="msheet-item" onClick={() => { const r = document.documentElement; const n = r.getAttribute("data-theme") === "dark" ? "light" : "dark"; r.setAttribute("data-theme", n); try { localStorage.setItem("fc-theme", n); } catch {} }}><Icon name="spark" size={17} />Theme</button>
            </div>
            <div className="msheet-foot">
              {canSignOut && onSignOut && <button onClick={onSignOut}>Sign out</button>}
              <button onClick={onExit}>Exit to site</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
