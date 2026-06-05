const DEFAULT = { firmKey: "topstep50", mode: "manual", manualBalance: 51000, start: 50000, selector: "", instrument: "MNQ", stop: 20 };
const $ = (id) => document.getElementById(id);

for (const k in FC_FIRMS) { const o = document.createElement("option"); o.value = k; o.textContent = FC_FIRMS[k].name; $("firmKey").appendChild(o); }
for (const k in FC_INSTRUMENTS) { const o = document.createElement("option"); o.value = k; o.textContent = k; $("instrument").appendChild(o); }

function applyMode(m) { $("manualWrap").style.display = m === "manual" ? "block" : "none"; $("selectorWrap").style.display = m === "selector" ? "block" : "none"; }
$("mode").addEventListener("change", () => applyMode($("mode").value));

function load() {
  chrome.storage.sync.get("fcGuardian", (d) => {
    const c = (d && d.fcGuardian) ? { ...DEFAULT, ...d.fcGuardian } : DEFAULT;
    $("firmKey").value = c.firmKey; $("mode").value = c.mode; $("manualBalance").value = c.manualBalance;
    $("selector").value = c.selector || ""; $("instrument").value = c.instrument; $("stop").value = c.stop;
    applyMode(c.mode);
  });
}
$("save").addEventListener("click", () => {
  const firm = FC_FIRMS[$("firmKey").value];
  const cfg = { firmKey: $("firmKey").value, mode: $("mode").value, manualBalance: Number($("manualBalance").value),
    start: firm.start, selector: $("selector").value, instrument: $("instrument").value, stop: Number($("stop").value) };
  chrome.storage.sync.set({ fcGuardian: cfg }, () => { $("saved").textContent = "Saved — HUD updated."; setTimeout(() => $("saved").textContent = "", 1800); });
});
load();
