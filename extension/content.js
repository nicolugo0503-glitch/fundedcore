// FundedCore Breach Guardian — floating HUD injected on every page.
(function () {
  if (window.__fcGuardian) return;
  window.__fcGuardian = true;

  const DEFAULT = { firmKey: "topstep50", mode: "manual", manualBalance: 51000, start: 50000,
    todayPnL: 0, selector: "", instrument: "MNQ", stop: 20 };
  let cfg = { ...DEFAULT };
  let peak = cfg.start;
  let collapsed = false;

  // ---- HUD ----
  const hud = document.createElement("div");
  hud.id = "fc-guardian-hud";
  hud.style.cssText = [
    "position:fixed","top:90px","right:18px","z-index:2147483647","width:220px",
    "font-family:Inter,system-ui,sans-serif","color:#F0F4FF","user-select:none",
    "background:linear-gradient(180deg,rgba(13,27,51,.97),rgba(10,22,40,.97))",
    "border:1px solid rgba(255,255,255,.12)","border-radius:14px","padding:12px 14px",
    "box-shadow:0 12px 40px -8px rgba(0,0,0,.6)","backdrop-filter:blur(6px)","cursor:grab"
  ].join(";");
  hud.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#60A5FA;font-weight:700">Breach Guardian</span>
      <span id="fc-collapse" style="cursor:pointer;color:#94A3B8;font-size:13px">▾</span>
    </div>
    <div id="fc-body">
      <div style="font-size:10px;text-transform:uppercase;color:#64748B">Distance to breach</div>
      <div id="fc-dtb" style="font-size:30px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1.1">$—</div>
      <div id="fc-bind" style="font-size:11px;color:#64748B;margin-top:1px">—</div>
      <div style="height:7px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;margin:9px 0 8px">
        <div id="fc-bar" style="height:100%;width:0%;border-radius:5px;background:#10B981;transition:width .3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#94A3B8">
        <span>Max <span id="fc-instr">MNQ</span> now</span><span id="fc-max" style="font-family:monospace;color:#F0F4FF">—</span>
      </div>
      <div id="fc-status" style="margin-top:8px;font-size:11px;font-weight:600;text-align:center;border-radius:8px;padding:4px 0">—</div>
    </div>`;
  document.documentElement.appendChild(hud);

  // collapse
  hud.querySelector("#fc-collapse").addEventListener("click", (e) => {
    e.stopPropagation(); collapsed = !collapsed;
    hud.querySelector("#fc-body").style.display = collapsed ? "none" : "block";
    hud.querySelector("#fc-collapse").textContent = collapsed ? "▸" : "▾";
  });

  // drag
  let dragging = false, ox = 0, oy = 0;
  hud.addEventListener("mousedown", (e) => {
    if (e.target.id === "fc-collapse") return;
    dragging = true; ox = e.clientX - hud.offsetLeft; oy = e.clientY - hud.offsetTop; hud.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return; hud.style.left = (e.clientX - ox) + "px"; hud.style.top = (e.clientY - oy) + "px"; hud.style.right = "auto";
  });
  window.addEventListener("mouseup", () => { dragging = false; hud.style.cursor = "grab"; });

  // ---- read equity from the page ----
  function readBalance() {
    if (cfg.mode === "manual") return Number(cfg.manualBalance) || cfg.start;
    if (cfg.mode === "selector" && cfg.selector) {
      try { const el = document.querySelector(cfg.selector); if (el) { const n = parseNum(el.textContent); if (n) return n; } } catch (e) {}
    }
    // auto: largest $ number on the page within a plausible band
    const txt = document.body ? document.body.innerText : "";
    const matches = txt.match(/\$?\s?[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?/g) || [];
    let best = 0;
    for (const m of matches) { const n = parseNum(m); if (n > best && n >= cfg.start * 0.4 && n <= cfg.start * 3) best = n; }
    return best || cfg.start;
  }
  function parseNum(s) { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }

  function render() {
    const balance = readBalance();
    if (balance > peak) peak = balance;
    const r = fcAssess({ firmKey: cfg.firmKey, start: cfg.start, balance, peak, todayPnL: balance - cfg.start });
    const cap = (FC_FIRMS[cfg.firmKey] || FC_FIRMS.topstep50).contractCap;
    const max = fcMaxSize(r.dtb, cfg.instrument, Number(cfg.stop) || 20, cap);
    const color = FC_STATUS_COLOR[r.status];
    const $ = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
    hud.querySelector("#fc-dtb").textContent = $(Math.max(0, r.dtb));
    hud.querySelector("#fc-dtb").style.color = color;
    hud.querySelector("#fc-bind").textContent = "via " + r.binding + " · " + r.firm.name;
    hud.querySelector("#fc-bar").style.width = Math.max(0, Math.min(1, r.pct)) * 100 + "%";
    hud.querySelector("#fc-bar").style.background = color;
    hud.querySelector("#fc-instr").textContent = cfg.instrument;
    hud.querySelector("#fc-max").textContent = max;
    const st = hud.querySelector("#fc-status");
    const label = { healthy: "HEALTHY", caution: "CAUTION — tighten up", danger: "DANGER — flatten now", breached: "BREACHED" }[r.status];
    st.textContent = label; st.style.color = color; st.style.background = color + "22";
    hud.style.borderColor = color + "66";
  }

  // ---- config load + live updates ----
  // On the FundedCore app itself, auto-configure from the suite profile.
  function tryAppProfile() {
    try {
      const raw = window.localStorage.getItem("fundedcore.profile.v1");
      if (!raw) return false;
      const p = JSON.parse(raw);
      const a = (p.accounts || [])[0];
      if (!a) return false;
      cfg = { ...cfg, firmKey: FC_FIRMS[a.firmKey] ? a.firmKey : cfg.firmKey, start: a.startBalance, mode: "manual", manualBalance: a.balance, instrument: (p.settings && p.settings.instrument) || cfg.instrument, stop: (p.settings && p.settings.defaultStop) || cfg.stop };
      peak = Math.max(a.peakEquity || a.startBalance, a.balance);
      return true;
    } catch (e) { return false; }
  }

  function load() {
    if (tryAppProfile()) { render(); }
    try {
      chrome.storage.sync.get("fcGuardian", (d) => { if (d && d.fcGuardian) { cfg = { ...DEFAULT, ...d.fcGuardian }; peak = Math.max(peak, cfg.start); } render(); });
    } catch (e) { render(); }
  }
  try { chrome.storage.onChanged.addListener((c) => { if (c.fcGuardian) { cfg = { ...DEFAULT, ...c.fcGuardian.newValue }; render(); } }); } catch (e) {}
  load();
  setInterval(render, 1500);
})();
