"use client";
import { useEffect, useRef, useState } from "react";

const FX = `
.tilt-wrap { perspective: 1100px; }
.tilt { transition: transform .25s cubic-bezier(.2,.8,.3,1); transform-style: preserve-3d; will-change: transform; }
.sframe { border-radius:20px; overflow:hidden; border:1px solid rgba(255,255,255,.07); box-shadow:0 50px 110px -45px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.04); }
.sv .draw { stroke-dasharray:1; stroke-dashoffset:1; }
.sv.in .draw { animation: svdraw 1.7s cubic-bezier(.3,.85,.25,1) forwards; }
.sv.in .draw.d2 { animation-delay:.2s; }
@keyframes svdraw { to { stroke-dashoffset:0; } }
.sv .pop { opacity:0; transform: translateY(6px); }
.sv.in .pop { animation: svpop .6s ease forwards; }
@keyframes svpop { to { opacity:1; transform:none; } }
.sv .seam { opacity:.5; } .sv.in .seam { animation: svseam 2.6s ease-in-out .6s infinite; }
@keyframes svseam { 0%,100%{opacity:.45} 50%{opacity:.95} }
@media (prefers-reduced-motion: reduce){ .sv .draw,.sv .pop{ animation:none!important; opacity:1; stroke-dashoffset:0; transform:none; } .tilt{ transition:none; } }
.imir-range{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:6px; background:rgba(255,255,255,.13); outline:none; }
.imir-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:50%; background:#34D399; cursor:grab; box-shadow:0 0 0 5px rgba(52,211,153,.22); transition:box-shadow .15s; }
.imir-range:active::-webkit-slider-thumb{ cursor:grabbing; box-shadow:0 0 0 8px rgba(52,211,153,.28); }
.imir-range::-moz-range-thumb{ width:24px; height:24px; border:none; border-radius:50%; background:#34D399; cursor:grab; box-shadow:0 0 0 5px rgba(52,211,153,.22); }
`;

function useCountUp(target: number, active: boolean, ms = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return; let raf = 0; const s = performance.now();
    const t = (n: number) => { const p = Math.min(1, (n - s) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(t); };
    raf = requestAnimationFrame(t); return () => cancelAnimationFrame(raf);
  }, [active, target, ms]);
  return v;
}

function Tilt({ children, active }: { children: (a: boolean) => any; active: boolean }) {
  const [tf, setTf] = useState("");
  function move(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    setTf(`rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`);
  }
  return (
    <div className="tilt-wrap" onMouseMove={move} onMouseLeave={() => setTf("")}>
      <div className="tilt sframe" style={{ transform: tf }}>{children(active)}</div>
    </div>
  );
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null); const [inv, setInv] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || !("IntersectionObserver" in window)) { setInv(true); return; }
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setInv(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return { ref, inv };
}

function Showcase({ eyebrow, title, body, foot, viz, flip }: { eyebrow: string; title: any; body: string; foot?: any; viz: (a: boolean) => any; flip?: boolean }) {
  const { ref, inv } = useInView<HTMLDivElement>();
  return (
    <section className="py-16 md:py-24">
      <style dangerouslySetInnerHTML={{ __html: FX }} />
      <div ref={ref} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className={flip ? "md:order-2" : ""}>
          <div className="eyebrow" style={{ color: "var(--acc)" }}>{eyebrow}</div>
          <h2 className="text-3xl md:text-[2.7rem] font-bold mt-3 leading-[1.07] tracking-tight">{title}</h2>
          <p className="text-t2 text-[1.04rem] mt-5 leading-relaxed max-w-md">{body}</p>
          {foot && <div className="mt-6">{foot}</div>}
        </div>
        <div className={flip ? "md:order-1" : ""}><Tilt active={inv}>{viz}</Tilt></div>
      </div>
    </section>
  );
}

function MirrorViz(active: boolean) {
  const tax = useCountUp(8866, active);
  return (
    <svg viewBox="0 0 560 380" className={`sv w-full ${active ? "in" : ""}`} style={{ display: "block", width: "100%", aspectRatio: "560 / 380" }}>
      <defs>
        <radialGradient id="mvl" cx="0.26" cy="0.5" r="0.6"><stop offset="0" stopColor="#EF4444" stopOpacity="0.18"/><stop offset="1" stopColor="#EF4444" stopOpacity="0"/></radialGradient>
        <radialGradient id="mvr" cx="0.74" cy="0.5" r="0.6"><stop offset="0" stopColor="#34D399" stopOpacity="0.18"/><stop offset="1" stopColor="#34D399" stopOpacity="0"/></radialGradient>
        <linearGradient id="mvseam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EF4444"/><stop offset="0.5" stopColor="#EAF0F7"/><stop offset="1" stopColor="#34D399"/></linearGradient>
      </defs>
      <rect width="560" height="380" fill="#080A0E"/><rect width="280" height="380" fill="url(#mvl)"/><rect x="280" width="280" height="380" fill="url(#mvr)"/>
      <g className="pop"><text x="28" y="56" fill="#EF4444" fontSize="13" fontWeight="700" letterSpacing="2">ACTUAL YOU</text><text x="28" y="92" fill="#EF4444" fontSize="34" fontWeight="800">-$174</text></g>
      <g className="pop" style={{ animationDelay: ".15s" }}><text x="532" y="56" fill="#34D399" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="end">DISCIPLINED YOU</text><text x="532" y="92" fill="#34D399" fontSize="34" fontWeight="800" textAnchor="end">+$8,692</text></g>
      <path pathLength={1} className="draw" d="M280,150 L235,165 L195,150 L150,185 L110,200 L65,245" fill="none" stroke="#EF4444" strokeWidth="2.6" strokeLinejoin="round"/>
      <path pathLength={1} className="draw d2" d="M280,150 L325,140 L365,158 L410,128 L455,140 L495,108" fill="none" stroke="#34D399" strokeWidth="3" strokeLinejoin="round"/>
      <rect className="seam" x="278" y="40" width="4" height="230" fill="url(#mvseam)"/>
      <g className="pop" style={{ animationDelay: "1.2s" }}><rect x="180" y="290" width="200" height="64" rx="14" fill="#0E1216" stroke="rgba(255,255,255,.08)"/>
      <text x="280" y="316" fill="#97A1B0" fontSize="11" fontWeight="700" letterSpacing="2" textAnchor="middle">THE GAP IS COSTING YOU</text>
      <text x="280" y="346" fill="#EF4444" fontSize="28" fontWeight="800" textAnchor="middle">${tax.toLocaleString()}</text></g>
    </svg>
  );
}
function ScoreViz(active: boolean) {
  const score = useCountUp(75, active); const breach = useCountUp(8, active);
  const r = 70, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return (
    <svg viewBox="0 0 560 380" className={`sv w-full ${active ? "in" : ""}`} style={{ display: "block", width: "100%", aspectRatio: "560 / 380" }}>
      <defs><radialGradient id="sgglow" cx="0.32" cy="0.3" r="0.6"><stop offset="0" stopColor="#10A37F" stopOpacity="0.16"/><stop offset="1" stopColor="#10A37F" stopOpacity="0"/></radialGradient></defs>
      <rect width="560" height="380" fill="#080A0E"/><rect width="560" height="380" fill="url(#sgglow)"/>
      <g transform="translate(150,190)">
        <circle r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14"/>
        <circle r={r} fill="none" stroke="#2BE3B0" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={off} transform="rotate(-90)"/>
        <text x="0" y="6" fill="#2BE3B0" fontSize="48" fontWeight="800" textAnchor="middle">{score}</text>
        <text x="0" y="34" fill="#7B8694" fontSize="13" fontWeight="600" textAnchor="middle">COMPOSURE · B</text>
      </g>
      <g transform="translate(300,120)"><g className="pop" style={{ animationDelay: ".4s" }}>
        <text x="0" y="0" fill="#7B8694" fontSize="13" fontWeight="700" letterSpacing="2">BREACH PROBABILITY</text>
        <text x="0" y="60" fill="#F5A623" fontSize="58" fontWeight="800">{breach}%</text>
        <text x="0" y="92" fill="#97A1B0" fontSize="16">in the next 5 days</text>
        <rect x="0" y="120" width="210" height="58" rx="12" fill="#0E1216" stroke="rgba(255,255,255,.08)"/>
        <text x="16" y="146" fill="#7B8694" fontSize="12" fontWeight="600">TO BREACH</text><text x="16" y="170" fill="#EAF0F7" fontSize="22" fontWeight="700">$1,000</text>
      </g></g>
    </svg>
  );
}
function EdgeViz(active: boolean) {
  const win = useCountUp(68, active);
  const dots = [[-0.9,"#EF4444",6],[-0.5,"#EF4444",8],[-0.2,"#EF4444",5],[0.25,"#34D399",7],[0.5,"#34D399",9],[0.7,"#34D399",6],[0.92,"#34D399",11]];
  return (
    <svg viewBox="0 0 560 380" className={`sv w-full ${active ? "in" : ""}`} style={{ display: "block", width: "100%", aspectRatio: "560 / 380" }}>
      <rect width="560" height="380" fill="#080A0E"/>
      <defs><linearGradient id="espec2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#EF4444" stopOpacity="0.5"/><stop offset="0.5" stopColor="#5C6675" stopOpacity="0.4"/><stop offset="1" stopColor="#34D399" stopOpacity="0.5"/></linearGradient></defs>
      <g className="pop"><text x="40" y="56" fill="#34D399" fontSize="13" fontWeight="700" letterSpacing="2">YOUR SHARPEST EDGE</text>
      <text x="40" y="100" fill="#EAF0F7" fontSize="30" fontWeight="800">MNQ · Longs · 14:00</text>
      <rect x="40" y="120" width="120" height="34" rx="9" fill="rgba(52,211,153,.1)" stroke="rgba(52,211,153,.3)"/><text x="100" y="143" fill="#34D399" fontSize="15" fontWeight="700" textAnchor="middle">{win}% win</text>
      <rect x="172" y="120" width="120" height="34" rx="9" fill="#0E1216" stroke="rgba(255,255,255,.08)"/><text x="232" y="143" fill="#EAF0F7" fontSize="15" fontWeight="700" textAnchor="middle">+$79 / trade</text></g>
      <line x1="50" y1="250" x2="510" y2="250" stroke="url(#espec2)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="280" y1="234" x2="280" y2="266" stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="2 3"/>
      {dots.map((d: any, i: number) => (<circle key={i} className="pop" style={{ animationDelay: `${0.3 + i * 0.08}s` }} cx={280 + (d[0] as number) * 230} cy="250" r={d[2]} fill={d[1]} fillOpacity="0.9" stroke={d[1]} strokeOpacity="0.28" strokeWidth="6"/>))}
      <text x="50" y="290" fill="#7B8694" fontSize="12" fontWeight="600">LOSING</text><text x="510" y="290" fill="#7B8694" fontSize="12" fontWeight="600" textAnchor="end">WINNING</text>
    </svg>
  );
}

export function MirrorShowcase() {
  const { ref, inv } = useInView<HTMLDivElement>();
  const [tilt, setTilt] = useState(0.6);
  const disc = 8692, actual = Math.round(8000 - tilt * 14000), tax = Math.max(0, disc - actual);
  const seamY = 150, yEnd = 100 + tilt * 185;
  const xs = [280, 235, 195, 150, 110, 65], fr = [0, 0.3, 0.45, 0.65, 0.82, 1], wob = [0, 8, -6, 12, -4, 0];
  const actualPath = xs.map((x, i) => `${i ? "L" : "M"}${x},${(seamY + (yEnd - seamY) * fr[i] + wob[i]).toFixed(1)}`).join(" ");
  const endY = (seamY + (yEnd - seamY) * 1 + 0).toFixed(1);
  return (
    <section className="py-16 md:py-24">
      <style dangerouslySetInnerHTML={{ __html: FX }} />
      <div ref={ref} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <div className="eyebrow" style={{ color: "var(--acc)" }}>The Mirror · Pro</div>
          <h2 className="text-3xl md:text-[2.7rem] font-bold mt-3 leading-[1.07] tracking-tight">Meet the trader you'd be if you <span className="grad-text">never tilted.</span></h2>
          <p className="text-t2 text-[1.04rem] mt-5 leading-relaxed max-w-md">We replay every one of your real trades and remove only the ones that broke your own rules. The gap between you and the disciplined you is the money your behavior — not the market — quietly took.</p>
          <div className="mt-6 inline-flex items-center gap-2 text-[.85rem] font-semibold" style={{ color: "var(--acc)" }}><span style={{ fontSize: "1.1rem" }}>↓</span> Drag the slider — watch what tilt actually costs.</div>
        </div>
        <div>
          <div className="tilt sframe" style={{ background: "#080A0E" }}>
            <svg viewBox="0 0 560 360" className={`sv w-full ${inv ? "in" : ""}`} style={{ display: "block", width: "100%", aspectRatio: "560 / 360" }}>
              <defs>
                <radialGradient id="imvl" cx="0.26" cy="0.5" r="0.6"><stop offset="0" stopColor="#EF4444" stopOpacity="0.18"/><stop offset="1" stopColor="#EF4444" stopOpacity="0"/></radialGradient>
                <radialGradient id="imvr" cx="0.74" cy="0.5" r="0.6"><stop offset="0" stopColor="#34D399" stopOpacity="0.18"/><stop offset="1" stopColor="#34D399" stopOpacity="0"/></radialGradient>
                <linearGradient id="imseam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EF4444"/><stop offset="0.5" stopColor="#EAF0F7"/><stop offset="1" stopColor="#34D399"/></linearGradient>
              </defs>
              <rect width="560" height="360" fill="#080A0E"/><rect width="280" height="360" fill="url(#imvl)"/><rect x="280" width="280" height="360" fill="url(#imvr)"/>
              <g className="pop"><text x="28" y="50" fill="#EF4444" fontSize="13" fontWeight="700" letterSpacing="2">ACTUAL YOU</text><text x="28" y="86" fill="#EF4444" fontSize="32" fontWeight="800">${actual.toLocaleString()}</text></g>
              <g className="pop" style={{ animationDelay: ".15s" }}><text x="532" y="50" fill="#34D399" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="end">DISCIPLINED YOU</text><text x="532" y="86" fill="#34D399" fontSize="32" fontWeight="800" textAnchor="end">+$8,692</text></g>
              <path d={actualPath} fill="none" stroke="#EF4444" strokeWidth="2.6" strokeLinejoin="round" style={{ transition: "d .15s" }}/>
              <path pathLength={1} className="draw d2" d="M280,150 L325,140 L365,158 L410,128 L455,140 L495,108" fill="none" stroke="#34D399" strokeWidth="3" strokeLinejoin="round"/>
              <circle cx="65" cy={endY} r="4.5" fill="#EF4444"/><circle cx="495" cy="108" r="4.5" fill="#34D399"/>
              <rect className="seam" x="278" y="34" width="4" height="216" fill="url(#imseam)"/>
              <rect x="170" y="276" width="220" height="64" rx="14" fill="#0E1216" stroke="rgba(255,255,255,.08)"/>
              <text x="280" y="302" fill="#97A1B0" fontSize="11" fontWeight="700" letterSpacing="2" textAnchor="middle">THE GAP IS COSTING YOU</text>
              <text x="280" y="332" fill="#EF4444" fontSize="28" fontWeight="800" textAnchor="middle">${tax.toLocaleString()}</text>
            </svg>
            <div style={{ padding: "0 22px 22px" }}>
              <div className="flex items-center justify-between text-[.7rem] font-semibold mb-2" style={{ color: "#7B8694" }}><span>HOW OFTEN YOU TILT</span><span>{Math.round(tilt * 100)}%</span></div>
              <input className="imir-range" type="range" min={0} max={100} value={Math.round(tilt * 100)} onChange={(e) => setTilt(+e.target.value / 100)} aria-label="How often you tilt" />
              <div className="flex justify-between text-[.66rem] mt-1.5" style={{ color: "#5C6675" }}><span>never</span><span>every day</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function ScoreShowcase() {
  return <Showcase flip eyebrow="FundedScore"
    title={<>Your odds of blowing up — <span className="grad-text">before you do.</span></>}
    body="A composure score and a breach probability, simulated from your own daily P&L against your firm's exact drawdown rules. The first honest read on whether your behavior keeps the account — not whether the market cooperates."
    viz={ScoreViz} />;
}
export function EdgeShowcase() {
  return <Showcase eyebrow="Your Edge · Pro"
    title={<>Trade only where you <span className="grad-text">actually win.</span></>}
    body="Not signals. Not market predictions. We mine your history for the exact conditions your own data proves you make money in — instrument, time, day, direction, setup — and the ones quietly bleeding you. Concentrate on your edge; cut the rest."
    viz={EdgeViz} />;
}
