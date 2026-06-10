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
    linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
  background-size: 100% 100%, 56px 56px, 56px 56px;
}
.lp .grad-text {
  background: linear-gradient(94deg, #EAF0F7 28%, #2BE3B0);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.lp .ticker-wrap { background: rgba(8,10,14,.92); }
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
.lp .lt-browser { box-shadow: 0 50px 120px -50px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.04); }
.lp .lt-live { display:inline-flex; align-items:center; gap:.4rem; font-size:.6rem; font-weight:700; letter-spacing:.12em; color:#2BE3B0; margin-left:auto; }
.lp .lt-live-dot { width:6px; height:6px; border-radius:50%; background:#2BE3B0; box-shadow:0 0 0 0 rgba(43,227,176,.6); animation: ltpulse 1.6s infinite; }
@keyframes ltpulse { 0%{box-shadow:0 0 0 0 rgba(43,227,176,.5)} 70%{box-shadow:0 0 0 7px rgba(43,227,176,0)} 100%{box-shadow:0 0 0 0 rgba(43,227,176,0)} }
.lp .lt-body { display:grid; grid-template-columns: 0.82fr 1.18fr; gap:0; }
.lp .lt-left { padding:20px 22px; border-right:1px solid var(--line); }
.lp .lt-right { padding:18px 20px; }
.lp .lt-dtb { font-size:2.5rem; font-weight:800; line-height:1; margin-top:4px; letter-spacing:-.02em; font-variant-numeric: tabular-nums; }
.lp .lt-meter { height:7px; border-radius:6px; background:rgba(255,255,255,.07); overflow:hidden; margin-top:12px; }
.lp .lt-meter-fill { height:100%; border-radius:6px; transition: width .25s linear, background .4s; }
.lp .lt-stat-row { display:flex; gap:26px; margin-top:18px; }
.lp .lt-eq { font-size:1.05rem; font-weight:700; color:var(--t1); }
.lp .lt-guard { margin-top:18px; font-size:.72rem; font-weight:600; padding:.5rem .7rem; border-radius:9px; border:1px solid; transition:.3s; }
.lp .lt-guard-ok { color:#2BE3B0; border-color:rgba(43,227,176,.3); background:rgba(43,227,176,.07); }
.lp .lt-guard-warn { color:#FBBF24; border-color:rgba(251,191,36,.32); background:rgba(251,191,36,.08); }
.lp .lt-guard-block { color:#F87171; border-color:rgba(248,113,113,.4); background:rgba(248,113,113,.1); animation: ltflash .6s ease-in-out 2; }
@keyframes ltflash { 50%{ background:rgba(248,113,113,.22); } }
.lp .lt-chart-head { display:flex; justify-content:space-between; font-size:.6rem; letter-spacing:.1em; color:var(--t3); text-transform:uppercase; font-weight:600; margin-bottom:6px; }
.lp .lt-svg { width:100%; height:150px; display:block; }
.lp .lt-accts { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.lp .lt-acct { display:flex; align-items:center; gap:10px; font-size:.7rem; }
.lp .lt-acct-name { color:var(--t2); width:84px; flex-shrink:0; }
.lp .lt-acct-bar { flex:1; height:6px; border-radius:5px; background:rgba(255,255,255,.06); overflow:hidden; }
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
        <GuardianBand />
        <Problem />
        <How />
        <ScoreSection />
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

      <div className="hidden lg:block absolute left-[-30px] top-44 floaty" style={{ ["--tilt" as any]: "-5deg" }}>
        <div className="card px-5 py-4 w-[200px] text-left">
          <div className="lbl">Distance to breach</div>
          <div className="mono text-2xl font-bold" style={{ color: "#34D399" }}>$1,820</div>
          <div className="h-1.5 rounded-full bg-white/[.08] mt-2 overflow-hidden"><div className="h-full w-[68%] rounded-full" style={{ background: "linear-gradient(90deg,#34D399,#22D3EE)" }} /></div>
        </div>
      </div>
      <div className="hidden lg:block absolute right-[-26px] top-64 floaty" style={{ ["--tilt" as any]: "4deg", animationDelay: "1.2s" }}>
        <div className="card px-5 py-4 w-[190px] text-left">
          <div className="lbl">Trader Score</div>
          <div className="mono text-2xl font-bold grad-text">87 A</div>
          <div className="text-[.7rem] text-t3 mt-1">edge: statistically real</div>
        </div>
      </div>
      <div className="hidden lg:block absolute right-[60px] top-[420px] floaty" style={{ ["--tilt" as any]: "-3deg", animationDelay: "2.1s" }}>
        <div className="card px-4 py-3 text-left">
          <div className="text-[.72rem] font-semibold" style={{ color: "#FBBF24" }}>⚠ CPI in 14m — no-trade window</div>
        </div>
      </div>

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
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${i >= 4 ? "border-acc/40 bg-acc/[.07]" : "border-white/[.07] bg-white/[.02]"}`}>
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
          <div className="p-4 text-t3 font-medium border-b border-white/[.07]"></div>
          <div className="p-4 font-semibold text-t2 border-b border-white/[.07] border-l border-white/[.06]">Traditional prop firm</div>
          <div className="p-4 font-semibold border-b border-white/[.07] border-l border-white/[.06] text-acc">FundedCore</div>
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
  const b = last ? "" : "border-b border-white/[.06]";
  return (
    <>
      <div className={`p-4 text-t2 ${b}`}>{cells[0]}</div>
      <div className={`p-4 text-t3 border-l border-white/[.06] ${b}`}>{cells[1]}</div>
      <div className={`p-4 text-t1 border-l border-white/[.06] bg-acc/[.06] ${b}`}>{cells[2]}</div>
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
