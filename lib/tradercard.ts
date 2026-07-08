// Renders the shareable "Trader Card" (1080x1350) to a canvas and fires the native
// Web Share sheet (with a download fallback). This is the growth object — a
// screenshot-ready identity card people post. Dark premium + brand green.
export type CardPayload = {
  name: string; archName: string; tagline: string;
  accent: "green" | "amber" | "red";
  survival: number; grade: string; breachPct: number;
  composure: number; winRatePct: number; topPct: number; trades: number;
};
const ACC = { green: "#2BE3B0", amber: "#F5A623", red: "#EF4444" };
const FS = "800 __px 'Helvetica Neue', Arial, sans-serif";

export async function shareTraderCard(p: CardPayload) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); if (!x) return;
  const acc = ACC[p.accent];

  // background
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0C1512"); bg.addColorStop(0.5, "#070A0E"); bg.addColorStop(1, "#070A0E");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W / 2, 220, 40, W / 2, 220, 620);
  glow.addColorStop(0, acc + "22"); glow.addColorStop(1, "#070A0E00"); x.fillStyle = glow; x.fillRect(0, 0, W, H);

  const font = (px: number, weight = 800) => { x.font = `${weight} ${px}px 'Helvetica Neue', Arial, sans-serif`; };
  const center = (s: string, y: number, col: string, px: number, weight = 800) => { font(px, weight); x.fillStyle = col; x.textAlign = "center"; x.fillText(s, W / 2, y); };

  // centered two-tone wordmark
  font(48); const wF = x.measureText("Funded").width, wC = x.measureText("Core").width, x0 = W / 2 - (wF + wC) / 2;
  x.textAlign = "left"; x.fillStyle = "#EAF0F7"; x.fillText("Funded", x0, 130); x.fillStyle = "#2BE3B0"; x.fillText("Core", x0 + wF, 130);

  center("YOUR TRADER TYPE", 250, "#7B8694", 30, 800);
  // archetype name (auto-fit)
  let ap = 92; font(ap); while (x.measureText(p.archName).width > W - 120 && ap > 52) { ap -= 4; font(ap); }
  center(p.archName, 350, "#EAF0F7", ap);
  center(p.tagline, 415, "#9AA6B4", 33, 500);

  // big survival ring number
  const cy = 620, r = 150;
  x.lineWidth = 20; x.strokeStyle = "rgba(255,255,255,.08)"; x.beginPath(); x.arc(W / 2, cy, r, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = acc; x.lineCap = "round"; x.beginPath(); x.arc(W / 2, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.survival / 100)); x.stroke();
  center(String(p.survival), cy + 22, acc, 92); center("SURVIVAL · " + p.grade, cy + 72, "#7B8694", 26, 700);

  // stat chips
  const chips: [string, string][] = [["COMPOSURE", String(Math.round(p.composure))], ["BREACH RISK", p.breachPct + "%"], ["WIN RATE", p.winRatePct + "%"]];
  const cw = 300, gap = 24, totalW = cw * 3 + gap * 2, sx = W / 2 - totalW / 2, sy = 850;
  chips.forEach(([lab, val], i) => {
    const bx = sx + i * (cw + gap);
    x.fillStyle = "#0E1216"; x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 2;
    roundRect(x, bx, sy, cw, 130, 20); x.fill(); x.stroke();
    center2(x, val, bx + cw / 2, sy + 60, "#EAF0F7", 44); center2(x, lab, bx + cw / 2, sy + 100, "#7B8694", 22, 700);
  });

  // top X% band
  const bandY = 1035; x.fillStyle = acc + "18"; x.strokeStyle = acc + "55"; roundRect(x, W / 2 - 300, bandY, 600, 82, 41); x.fill(); x.stroke();
  center(`TOP ${Math.max(1, 100 - p.topPct)}% OF FUNDED TRADERS`, bandY + 52, acc, 30, 800);

  // verified seal + footer
  center("✓ Verified by FundedCore · " + p.trades + " trades", 1185, "#9AA6B4", 26, 600);
  center("funded-core.com", 1270, "#2BE3B0", 40, 800);

  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b as Blob), "image/png"));
  const file = new File([blob], "fundedcore-trader-card.png", { type: "image/png" });
  try {
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({ files: [file], title: "My FundedCore Trader Card", text: `I'm ${p.archName} — Survival ${p.survival}/100, top ${Math.max(1, 100 - p.topPct)}%. What's yours? funded-core.com` });
      return;
    }
  } catch {}
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "fundedcore-trader-card.png"; a.click(); URL.revokeObjectURL(url);
}
function roundRect(x: CanvasRenderingContext2D, bx: number, by: number, w: number, h: number, r: number) { x.beginPath(); x.moveTo(bx + r, by); x.arcTo(bx + w, by, bx + w, by + h, r); x.arcTo(bx + w, by + h, bx, by + h, r); x.arcTo(bx, by + h, bx, by, r); x.arcTo(bx, by, bx + w, by, r); x.closePath(); }
function center2(x: CanvasRenderingContext2D, s: string, cx: number, y: number, col: string, px: number, weight = 800) { x.font = `${weight} ${px}px 'Helvetica Neue', Arial, sans-serif`; x.fillStyle = col; x.textAlign = "center"; x.fillText(s, cx, y); }
