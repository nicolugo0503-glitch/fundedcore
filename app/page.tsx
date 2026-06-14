import Link from "next/link";
import { Nav, Footer } from "../components/Nav";
import { Ticker } from "../components/Ticker";
import { LiveTerminal } from "../components/LiveTerminal";
import { ForceDark } from "../components/ForceDark";
import { RevealOnScroll } from "../components/RevealOnScroll";
import { Icon } from "../components/Icon";

const LP_CSS = `
.lp { position: relative; }
.lp::before {
  content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(1000px 520px at 50% -120px, rgba(16,163,127,.12), transparent 70%),
    linear-gradient(rgba(128,128,128,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(128,128,128,.05) 1px, transparent 1px);
  background-size: 100% 100%, 56px 56px, 56px 56px;
}
.lp .grad-text {
  background: linear-gradient(94deg, var(--t1) 22%, var(--acc));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.lp .icon-tile {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 11px; color: var(--acc);
  background: var(--acc-weak); border: 1px solid var(--line2);
}

/* floating cards actually float */
@keyframes lpfloat { 0%,100%{ transform: translateY(0) rotate(var(--tilt,0deg)); } 50%{ transform: translateY(-12px) rotate(var(--tilt,0deg)); } }
.lp .floaty { animation: lpfloat 7s ease-in-out infinite; }
.lp .floaty:nth-of-type(2) { animation-duration: 8.5s; }
/* scroll choreography */
.lp .rv { opacity: 0; transform: translateY(22px); transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); }
.lp .rv-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce){ .lp .floaty{animation:none} .lp .rv{opacity:1;transform:none;transition:none} }
/* live terminal */
.lp .lt-browser { box-shadow: 0 40px 90px -45px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.04); }
.lp .lt-live { display:inline-flex; align-items:center; gap:.4rem; font-size:.6rem; font-weight:700; letter-spacing:.12em; color:#0a8f6e; margin-left:auto; }
.lp .lt-live-dot { width:6px; height:6px; border-radius:50%; background:#10A37F; box-shadow:0 0 0 0 rgba(16,163,127,.6); animation: ltpulse 1.6s infinite; }
@keyframes ltpulse { 0%{box-shadow:0 0 0 0 rgba(16,163,127,.5)} 70%{box-shadow:0 0 0 7px rgba(16,163,127,0)} 100%{box-shadow:0 0 0 0 rgba(16,163,127,0)} }
.lp .lt-body { display:grid; grid-template-columns: 0.82fr 1.18fr; gap:0; }
.lp .lt-left { padding:20px 22px; border-right:1px solid var(--line); }
.lp .lt-right { padding:18px 20px; }
.lp .lt-dtb { font-size:2.5rem; font-weight:800; line-height:1; margin-top:4px; letter-spacing:-.02em; font-variant-numeric: tabular-nums; }
.lp .lt-meter { height:7px; border-radius:6px; background:rgba(128,128,128,.16); overflow:hidden; margin-top:12px; }
.lp .lt-meter-fill { height:100%; border-radius:6px; transition: width .25s linear, background .4s; }
.lp .lt-stat-row { display:flex; gap:26px; margin-top:18px; }
.lp .lt-eq { font-size:1.05rem; font-weight:700; color:var(--t1); }
.lp .lt-guard { margin-top:18px; font-size:.72rem; font-weight:600; padding:.5rem .7rem; border-radius:9px; border:1px solid; transition:.3s; }
.lp .lt-guard-ok { color:#0a8f6e; border-color:rgba(16,163,127,.3); background:rgba(16,163,127,.08); }
.lp .lt-guard-warn { color:#B45309; border-color:rgba(217,119,6,.32); background:rgba(217,119,6,.08); }
.lp .lt-guard-block { color:#DC2626; border-color:rgba(220,38,38,.4); background:rgba(220,38,38,.09); animation: ltflash .6s ease-in-out 2; }
@keyframes ltflash { 50%{ background:rgba(248,113,113,.22); } }
.lp .lt-chart-head { display:flex; justify-content:space-between; font-size:.6rem; letter-spacing:.1em; color:var(--t3); text-transform:uppercase; font-weight:600; margin-bottom:6px; }
.lp .lt-svg { width:100%; height:150px; display:block; }
.lp .lt-accts { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.lp .lt-acct { display:flex; align-items:center; gap:10px; font-size:.7rem; }
.lp .lt-acct-name { color:var(--t2); width:84px; flex-shrink:0; }
.lp .lt-acct-bar { flex:1; height:6px; border-radius:5px; background:rgba(128,128,128,.16); overflow:hidden; }
.lp .lt-acct-bar > span { display:block; height:100%; border-radius:5px; transition:width .6s; }
@media (max-width:720px){ .lp .lt-body{ grid-template-columns:1fr; } .lp .lt-left{ border-right:0; border-bottom:1px solid var(--line);} }

`;

export default function Home() {
  return (
    <div className="lp">
      <ForceDark />
      <RevealOnScroll />
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />
      <Nav />
      <Ticker />
      <main className="max-w-6xl mx-auto px-5">
        <Hero />
        <MirrorShowcase />
        <ScoreShowcase />
        <EdgeShowcase />
        <Problem />
        <Economics />
        <Compare />
        <Pricing />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}


function ShowFrame({ children }: { children: any }) {
  return <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 50px 110px -45px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.04)" }}>{children}</div>;
}
function Showcase({ eyebrow, title, body, foot, visual, flip }: { eyebrow: string; title: any; body: string; foot?: any; visual: any; flip?: boolean }) {
  return (
    <section className="py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className={flip ? "md:order-2" : ""}>
          <div className="eyebrow" style={{ color: "var(--acc)" }}>{eyebrow}</div>
          <h2 className="text-3xl md:text-[2.7rem] font-bold mt-3 leading-[1.07] tracking-tight">{title}</h2>
          <p className="text-t2 text-[1.04rem] mt-5 leading-relaxed max-w-md">{body}</p>
          {foot && <div className="mt-6">{foot}</div>}
        </div>
        <div className={flip ? "md:order-1" : ""}><ShowFrame>{visual}</ShowFrame></div>
      </div>
    </section>
  );
}

function MirrorViz() {
  return (
    <svg viewBox="0 0 560 380" className="w-full" style={{ display: "block" }}>
      <defs>
        <radialGradient id="mvl" cx="0.26" cy="0.5" r="0.6"><stop offset="0" stopColor="#EF4444" stopOpacity="0.18"/><stop offset="1" stopColor="#EF4444" stopOpacity="0"/></radialGradient>
        <radialGradient id="mvr" cx="0.74" cy="0.5" r="0.6"><stop offset="0" stopColor="#34D399" stopOpacity="0.18"/><stop offset="1" stopColor="#34D399" stopOpacity="0"/></radialGradient>
        <linearGradient id="mvseam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EF4444"/><stop offset="0.5" stopColor="#EAF0F7"/><stop offset="1" stopColor="#34D399"/></linearGradient>
      </defs>
      <rect width="560" height="380" fill="#080A0E"/>
      <rect width="280" height="380" fill="url(#mvl)"/><rect x="280" width="280" height="380" fill="url(#mvr)"/>
      <text x="28" y="56" fill="#EF4444" fontSize="13" fontWeight="700" letterSpacing="2">ACTUAL YOU</text>
      <text x="28" y="92" fill="#EF4444" fontSize="34" fontWeight="800">-$174</text>
      <text x="532" y="56" fill="#34D399" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="end">DISCIPLINED YOU</text>
      <text x="532" y="92" fill="#34D399" fontSize="34" fontWeight="800" textAnchor="end">+$8,692</text>
      <path d="M280,150 L235,165 L195,150 L150,185 L110,200 L65,245" fill="none" stroke="#EF4444" strokeWidth="2.6" strokeLinejoin="round"/>
      <path d="M280,150 L325,140 L365,158 L410,128 L455,140 L495,108" fill="none" stroke="#34D399" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="65" cy="245" r="4.5" fill="#EF4444"/><circle cx="495" cy="108" r="4.5" fill="#34D399"/>
      <rect x="278" y="40" width="4" height="230" fill="url(#mvseam)" opacity="0.5"/>
      <rect x="180" y="290" width="200" height="64" rx="14" fill="#0E1216" stroke="rgba(255,255,255,.08)"/>
      <text x="280" y="316" fill="#97A1B0" fontSize="11" fontWeight="700" letterSpacing="2" textAnchor="middle">THE GAP IS COSTING YOU</text>
      <text x="280" y="346" fill="#EF4444" fontSize="28" fontWeight="800" textAnchor="middle">$8,866</text>
    </svg>
  );
}

function ScoreViz() {
  const r = 70, c = 2 * Math.PI * r, p = 0.75;
  return (
    <svg viewBox="0 0 560 380" className="w-full" style={{ display: "block" }}>
      <rect width="560" height="380" fill="#080A0E"/>
      <rect width="560" height="380" fill="url(#sgglow)"/>
      <defs><radialGradient id="sgglow" cx="0.32" cy="0.3" r="0.6"><stop offset="0" stopColor="#10A37F" stopOpacity="0.16"/><stop offset="1" stopColor="#10A37F" stopOpacity="0"/></radialGradient></defs>
      <g transform="translate(150,190)">
        <circle r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14"/>
        <circle r={r} fill="none" stroke="#2BE3B0" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c*p} ${c}`} transform="rotate(-90)"/>
        <text x="0" y="6" fill="#2BE3B0" fontSize="48" fontWeight="800" textAnchor="middle">75</text>
        <text x="0" y="34" fill="#7B8694" fontSize="13" fontWeight="600" textAnchor="middle">COMPOSURE · B</text>
      </g>
      <g transform="translate(300,120)">
        <text x="0" y="0" fill="#7B8694" fontSize="13" fontWeight="700" letterSpacing="2">BREACH PROBABILITY</text>
        <text x="0" y="60" fill="#F5A623" fontSize="58" fontWeight="800">8%</text>
        <text x="0" y="92" fill="#97A1B0" fontSize="16">in the next 5 days</text>
        <rect x="0" y="120" width="210" height="58" rx="12" fill="#0E1216" stroke="rgba(255,255,255,.08)"/>
        <text x="16" y="146" fill="#7B8694" fontSize="12" fontWeight="600">TO BREACH</text>
        <text x="16" y="170" fill="#EAF0F7" fontSize="22" fontWeight="700">$1,000</text>
      </g>
    </svg>
  );
}

function EdgeViz() {
  const dots = [[-0.9,"#EF4444",6],[-0.5,"#EF4444",8],[-0.2,"#EF4444",5],[0.25,"#34D399",7],[0.5,"#34D399",9],[0.7,"#34D399",6],[0.92,"#34D399",11]];
  return (
    <svg viewBox="0 0 560 380" className="w-full" style={{ display: "block" }}>
      <rect width="560" height="380" fill="#080A0E"/>
      <defs><linearGradient id="espec2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#EF4444" stopOpacity="0.5"/><stop offset="0.5" stopColor="#5C6675" stopOpacity="0.4"/><stop offset="1" stopColor="#34D399" stopOpacity="0.5"/></linearGradient></defs>
      <text x="40" y="56" fill="#34D399" fontSize="13" fontWeight="700" letterSpacing="2">YOUR SHARPEST EDGE</text>
      <text x="40" y="100" fill="#EAF0F7" fontSize="30" fontWeight="800">MNQ · Longs · 14:00</text>
      <rect x="40" y="120" width="120" height="34" rx="9" fill="rgba(52,211,153,.1)" stroke="rgba(52,211,153,.3)"/><text x="100" y="143" fill="#34D399" fontSize="15" fontWeight="700" textAnchor="middle">68% win</text>
      <rect x="172" y="120" width="120" height="34" rx="9" fill="#0E1216" stroke="rgba(255,255,255,.08)"/><text x="232" y="143" fill="#EAF0F7" fontSize="15" fontWeight="700" textAnchor="middle">+$79 / trade</text>
      <line x1="50" y1="250" x2="510" y2="250" stroke="url(#espec2)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="280" y1="234" x2="280" y2="266" stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="2 3"/>
      {dots.map((d:any,i:number)=>(<circle key={i} cx={280 + (d[0]as number)*230} cy="250" r={d[2]} fill={d[1]} fillOpacity="0.9" stroke={d[1]} strokeOpacity="0.28" strokeWidth="6"/>))}
      <text x="50" y="290" fill="#7B8694" fontSize="12" fontWeight="600">LOSING</text>
      <text x="510" y="290" fill="#7B8694" fontSize="12" fontWeight="600" textAnchor="end">WINNING</text>
    </svg>
  );
}

function MirrorShowcase() {
  return <Showcase eyebrow="The Mirror · Pro"
    title={<>Meet the trader you'd be if you <span className="grad-text">never tilted.</span></>}
    body="We replay every one of your real trades and remove only the ones that broke your own rules. What's left is the disciplined you — and the gap between you two is the money your behavior, not the market, quietly took."
    foot={<div className="text-[.82rem] text-t3">The average funded trader leaks thousands a month to tilt. The Mirror puts a number on yours.</div>}
    visual={<MirrorViz />} />;
}
function ScoreShowcase() {
  return <Showcase flip eyebrow="FundedScore"
    title={<>Your odds of blowing up — <span className="grad-text">before you do.</span></>}
    body="A composure score and a breach probability, simulated from your own daily P&L against your firm's exact drawdown rules. The first honest read on whether your behavior keeps the account — not whether the market cooperates."
    visual={<ScoreViz />} />;
}
function EdgeShowcase() {
  return <Showcase eyebrow="Your Edge · Pro"
    title={<>Trade only where you <span className="grad-text">actually win.</span></>}
    body="Not signals. Not market predictions. We mine your history for the exact conditions your own data proves you make money in — instrument, time, day, direction, setup — and the ones quietly bleeding you. Concentrate on your edge; cut the rest."
    visual={<EdgeViz />} />;
}

function GuardianBand() {
  const cards: [string, string, string, string, string][] = [
    ["grid", "Risk Cockpit", "Every funded account on one screen, with live Distance to Breach and status across all your firms.", "/cockpit", "Open cockpit"],
    ["shield", "Pre-trade guardrail", "Before you click buy: the largest size you can take right now without breaching. APPROVE, REDUCE, or BLOCK.", "/cockpit", "Try the guardrail"],
    ["bolt", "Live demo", "Watch the Guardian track a simulated account tick by tick — and scream before it breaches.", "/live", "Watch it live"],
  ];
  return (
    <section className="py-12">
      <div className="grid md:grid-cols-3 gap-5">
        {cards.map(([ic, t, d, href, cta]) => (
          <Link key={t} href={href} className="card card-hover p-6 block group">
            <span className="icon-tile mb-4"><Icon name={ic} size={19} /></span>
            <h3 className="font-semibold text-lg">{t}</h3>
            <p className="text-[.88rem] text-t2 mt-2 leading-relaxed">{d}</p>
            <div className="text-acc text-sm font-medium mt-4 inline-flex items-center gap-1.5">
              {cta}<span className="transition-transform group-hover:translate-x-1.5">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="pt-20 pb-16 text-center relative">
      <div className="inline-flex items-center gap-2 chip mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-grn pulse" /> The command center for funded futures traders
      </div>
      <h1 className="text-[2.7rem] md:text-[4rem] font-bold leading-[1.04] tracking-tight max-w-4xl mx-auto">
        Every tool a funded trader needs.<br className="hidden md:block" />
        <span className="grad-text">One terminal. Completely free.</span>
      </h1>
      <p className="mt-6 text-lg text-t2 max-w-2xl mx-auto leading-relaxed">
        Risk cockpit, pre-trade guardrail, live news, leak-finder, AI coach, and your Trader Score —
        personalized to you, in one place. Before every trade, you see <strong className="text-t1">everything</strong>.
        It&apos;s <strong className="text-t1">free</strong> — upload your trades and see your real edge and your Distance to Breach before you risk another dollar.
      </p>
      <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
        <Link href="/suite" className="btn btn-primary text-base !px-7 !py-3.5">Start free →</Link>
        <Link href="/live" className="btn btn-ghost text-base !px-6 !py-3.5">Watch it live</Link>
      </div>
      <div className="mt-5 text-xs text-t3">Free · no card · upload your CSV and see your edge in a minute.</div>

      <LiveTerminal />

      <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          ["8", "tools in one terminal"],
          ["Free", "full access"],
          ["13+", "firm rule-sets built in"],
          ["0", "tabs you'll miss"],
        ].map(([n, l]) => (
          <div key={l} className="card p-5">
            <div className="text-2xl md:text-3xl font-bold grad-text mono">{n}</div>
            <div className="text-[.8rem] text-t2 mt-1">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="py-16">
      <div className="card p-7 md:p-10">
        <div className="eyebrow">The $400M middleman</div>
        <h2 className="text-2xl md:text-[2rem] font-bold mt-2 max-w-3xl leading-snug">
          The prop-challenge industry sells lottery tickets dressed up as meritocracy.
        </h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5 text-[.92rem] text-t2 leading-relaxed">
          <p>
            Traditional firms charge <strong className="text-t1">$200&ndash;$1,000</strong> for an
            evaluation, then layer on profit targets, trailing drawdowns, and consistency rules that
            the overwhelming majority of accounts never clear.
          </p>
          <p>
            Industry estimates put pass rates in the <strong className="text-t1">single digits</strong>.
            The product being sold isn&apos;t capital — it&apos;s the <em>fee</em>. The harder it is to pass, the
            better the unit economics for the house.
          </p>
          <p>
            FundedCore doesn&apos;t build a better dashboard for that model. We delete the model. We move
            the question from <em>&ldquo;can you survive our obstacle course?&rdquo;</em> to{" "}
            <strong className="text-t1">&ldquo;do you actually have an edge?&rdquo;</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps: [string, string, string, string][] = [
    ["repeat", "01", "Connect your accounts", "Add every funded account across every firm. The cockpit knows each firm's exact drawdown and daily-loss rules out of the box."],
    ["shield", "02", "See your Distance to Breach", "Live, per account: how much room you have left before the account dies — and the largest size you can safely take right now."],
    ["spark", "03", "Know your edge", "Every trade builds your Trader Score — a transparent read on whether your edge is real, consistent, and worth scaling."],
  ];
  return (
    <section id="how" className="py-16">
      <SectionHead eyebrow="How it works" title="Three things, one job: keep your account alive." />
      <div className="grid md:grid-cols-3 gap-5 mt-9">
        {steps.map(([ic, n, t, d]) => (
          <div key={n} className="card card-hover p-6">
            <div className="flex items-center justify-between">
              <span className="icon-tile"><Icon name={ic} size={18} /></span>
              <span className="mono text-t3 text-sm font-semibold">{n}</span>
            </div>
            <h3 className="text-lg font-semibold mt-4">{t}</h3>
            <p className="text-[.88rem] text-t2 mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreSection() {
  const dims: [string, string, string][] = [
    ["spark", "Edge Quality", "Is the edge real and statistically credible? Profit factor, expectancy, and the t-stat that says it isn't just luck."],
    ["chart", "Consistency", "Broad-based returns vs. one lucky day. Best-day concentration, winning-day rate, equity-curve smoothness."],
    ["shield", "Discipline", "Behavioral control. Stable bet sizing, no revenge sizing after losses, no escalation inside losing streaks."],
    ["gauge", "Drawdown Control", "How you handle pain. Max drawdown depth, recovery factor, and how long you stay underwater."],
  ];
  return (
    <section id="score" className="py-16">
      <SectionHead
        eyebrow="The Trader Score"
        title="A credit score for traders."
        sub="Not win rate. Not risk-reward. A behavioral + statistical fingerprint of your edge — the foundation every funding decision is built on. Fully transparent: you see every metric that moved your number."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-9">
        {dims.map(([ic, t, d]) => (
          <div key={t} className="card card-hover p-6">
            <span className="icon-tile mb-4"><Icon name={ic} size={19} /></span>
            <h3 className="font-semibold">{t}</h3>
            <p className="text-[.85rem] text-t2 mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 text-center">
        <Link href="/apply" className="btn btn-primary">Score a real history now →</Link>
      </div>
    </section>
  );
}

function Economics() {
  return (
    <section id="economics" className="py-16">
      <div className="card p-7 md:p-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="eyebrow">The flywheel</div>
            <h2 className="text-2xl md:text-[2rem] font-bold mt-2 leading-snug">
              Every trader makes the underwriting smarter.
            </h2>
            <p className="text-[.92rem] text-t2 mt-4 leading-relaxed">
              Each trader who connects their history trains the model that decides who gets funded.
              Better data &rarr; sharper underwriting &rarr; better traders funded &rarr; more institutional capital &rarr;
              more traders. The data asset compounds — and it&apos;s the moat.
            </p>
            <ol className="mt-6 space-y-3">
              {[
                "Opt-in anonymized performance data benchmarks everyone.",
                "Sharper risk models fund higher-quality traders.",
                "Verified returns attract institutional capital pools.",
                "More capital and traders feed the model again.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-[.88rem] text-t2">
                  <span className="mono text-acc">{i + 1}</span>{s}
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-3">
            <div className="text-xs text-t3 uppercase tracking-wide mb-1">Illustrative model at scale</div>
            {[
              ["1,000,000", "funded traders"],
              ["× $50,000", "avg account size"],
              ["× 10%", "annual return"],
              ["= $5B", "total trader profits / yr"],
              ["× 25%", "FundedCore's cut"],
              ["= $1.25B", "annual revenue"],
            ].map(([a, b], i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${i >= 4 ? "border-acc/40 bg-acc/[.07]" : "border-black/[.07] bg-black/[.02]"}`}>
                <span className="mono text-lg font-semibold">{a}</span>
                <span className="text-[.82rem] text-t2">{b}</span>
              </div>
            ))}
            <p className="text-[.72rem] text-t3 leading-relaxed pt-1">
              Illustrative scenario for the addressable opportunity, not a forecast or projection of
              actual results.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Compare() {
  const rows = [
    ["Upfront cost", "$200 – $1,000 per attempt", "$0 — always free"],
    ["What you're buying", "A challenge / evaluation", "A verdict on your real edge"],
    ["Pass philosophy", "Rules tuned to extract fees", "Underwrite genuine edge"],
    ["When you pay", "Before you trade a dollar", "Only on profit you make"],
    ["Profit split", "Often 80–90% (after you pass)", "75–90% (no challenge to pass)"],
    ["Transparency", "Opaque pass/fail", "Every metric shown to you"],
    ["Re-attempts", "Pay again each time", "Unlimited, free"],
  ];
  return (
    <section className="py-16">
      <SectionHead eyebrow="The difference" title="We're not a better challenge. We removed the challenge." />
      <div className="card overflow-hidden mt-9">
        <div className="grid grid-cols-3 text-sm">
          <div className="p-4 text-t3 font-medium border-b border-black/[.07]"></div>
          <div className="p-4 font-semibold text-t2 border-b border-black/[.07] border-l border-black/[.06]">Traditional prop firm</div>
          <div className="p-4 font-semibold border-b border-black/[.07] border-l border-black/[.06] text-acc">FundedCore</div>
          {rows.map((r, i) => (
            <Row key={i} cells={r} last={i === rows.length - 1} />
          ))}
        </div>
      </div>
      <p className="text-[.72rem] text-t3 mt-3">
        Comparison reflects the typical challenge-fee model; specific firms vary. Figures are general
        and for illustration.
      </p>
    </section>
  );
}
function Row({ cells, last }: { cells: string[]; last: boolean }) {
  const b = last ? "" : "border-b border-black/[.06]";
  return (
    <>
      <div className={`p-4 text-t2 ${b}`}>{cells[0]}</div>
      <div className={`p-4 text-t3 border-l border-black/[.06] ${b}`}>{cells[1]}</div>
      <div className={`p-4 text-t1 border-l border-black/[.06] bg-acc/[.06] ${b}`}>{cells[2]}</div>
    </>
  );
}

function Pricing() {
  const inc = ["Risk cockpit + Distance to Breach", "Pre-trade guardrail (max safe size)", "Live high-impact news + no-trade windows", "Leak-finder (what's costing you)", "AI coach grounded in your data", "Challenge / pass tracker", "Trader Score + journal", "Personalized daily brief"];
  return (
    <section className="py-16">
      <div className="max-w-xl mx-auto card p-8 text-center" style={{ borderColor: "rgba(16,163,127,.4)" }}>
        <div className="eyebrow">The deal</div>
        <h2 className="text-3xl font-bold mt-2">Free<span className="text-lg text-t2"> · every tool</span></h2>
        <p className="text-t2 text-sm mt-1">Every tool, completely free — risk cockpit, pre-trade guardrail, AI coach, your Trader Score and Distance to Breach. No card required.</p>
        <ul className="text-left mt-6 grid sm:grid-cols-2 gap-y-2 gap-x-4">
          {inc.map((x) => <li key={x} className="text-[.86rem] text-t2 flex gap-2"><span className="text-grn">✓</span>{x}</li>)}
        </ul>
        <Link href="/suite" className="btn btn-primary w-full mt-7">Start free →</Link>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    ["Is it really free?", "Yes — completely free. No card, no fee, full access to every tool. Upload your trade history, add your funded account, and see your edge and your Distance to Breach in under a minute."],
    ["How do you make money if there's no challenge fee?", "We take a cut (25%, less for top scores) of the profits traders make on our capital. We win only when our traders win — which is why our incentive is to fund people who can actually trade, not to sell failures."],
    ["What data do I need to upload?", "A trade-history CSV with, at minimum, a profit/loss column and ideally dates and position sizes. Most broker and journal exports work as-is — our parser maps the columns automatically. You can also try a sample trader first."],
    ["What if I get declined?", "You see exactly why — every flag, every metric. Fix it, log more trades, and re-submit. There's no limit and no fee. A decline is feedback, not a paywall."],
    ["Is my data private?", "Your raw history is yours. Benchmarking uses opt-in, anonymized aggregates only. You control what's shared."],
  ];
  return (
    <section className="py-16">
      <SectionHead eyebrow="FAQ" title="The obvious questions." />
      <div className="mt-9 max-w-3xl mx-auto space-y-3">
        {qs.map(([q, a]) => (
          <details key={q} className="card p-5 group">
            <summary className="cursor-pointer font-semibold flex items-center justify-between list-none">
              {q}<span className="text-acc group-open:rotate-45 transition mono text-lg">+</span>
            </summary>
            <p className="text-[.88rem] text-t2 mt-3 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="py-16">
      <div className="card p-10 md:p-14 text-center relative overflow-hidden">
        <div style={{ width: 560, height: 560, background: "radial-gradient(circle,rgba(16,163,127,.22),transparent 70%)", top: -220, left: "50%", transform: "translateX(-50%)", position: "absolute", pointerEvents: "none" }} />
        <div className="relative">
          <h2 className="text-3xl md:text-[2.6rem] font-bold leading-tight max-w-2xl mx-auto">
            Stop trading one bad click away from a blown account.
          </h2>
          <p className="text-t2 mt-4 max-w-xl mx-auto">Free. Upload your trade history, add your funded account, and see your edge and your Distance to Breach in under a minute.</p>
          <Link href="/suite" className="btn btn-primary text-base !px-8 !py-4 mt-8">Start free →</Link>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="text-2xl md:text-[2rem] font-bold mt-2 leading-snug">{title}</h2>
      {sub && <p className="text-[.95rem] text-t2 mt-3 leading-relaxed">{sub}</p>}
    </div>
  );
}
