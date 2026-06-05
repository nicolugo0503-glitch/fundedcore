import Link from "next/link";
import { Nav, Footer } from "../components/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-5">
        <Hero />
        <GuardianBand />
        <Problem />
        <How />
        <ScoreSection />
        <Economics />
        <Compare />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}

function GuardianBand() {
  const cards = [
    ["Risk Cockpit", "Every funded account on one screen, with live Distance to Breach and status across all your firms.", "/cockpit", "Open cockpit →"],
    ["Pre-trade guardrail", "Before you click buy: the largest size you can take right now without breaching. APPROVE, REDUCE, or BLOCK.", "/cockpit", "Try the guardrail →"],
    ["Live demo", "Watch the Guardian track a simulated account tick by tick — and scream before it breaches.", "/live", "Watch it live →"],
  ];
  return (
    <section className="py-12">
      <div className="grid md:grid-cols-3 gap-5">
        {cards.map(([t, d, href, cta]) => (
          <Link key={t} href={href} className="card card-hover p-6 block">
            <h3 className="font-semibold text-lg">{t}</h3>
            <p className="text-[.88rem] text-t2 mt-2 leading-relaxed">{d}</p>
            <div className="text-acc text-sm font-medium mt-4">{cta}</div>
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
        <span className="w-1.5 h-1.5 rounded-full bg-grn pulse" /> The always-on risk layer for funded traders
      </div>
      <h1 className="text-[2.7rem] md:text-[4rem] font-bold leading-[1.04] tracking-tight max-w-4xl mx-auto">
        Never blow a <span className="grad-text">funded account</span><br className="hidden md:block" />
        by accident again.
      </h1>
      <p className="mt-6 text-lg text-t2 max-w-2xl mx-auto leading-relaxed">
        One blown rule ends a funded account you paid for. FundedCore is the cockpit that tracks your
        <strong className="text-t1"> Distance to Breach</strong> across every account and firm in real time —
        and a pre-trade guardrail that tells you the largest size you can take right now without blowing up.
      </p>
      <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
        <Link href="/cockpit" className="btn btn-primary text-base !px-7 !py-3.5">Open the Risk Cockpit →</Link>
        <Link href="/live" className="btn btn-ghost text-base !px-6 !py-3.5">Watch it live</Link>
      </div>
      <div className="mt-5 text-xs text-t3">Free to start · connect every funded account, across every firm.</div>

      <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          ["1", "screen for every account"],
          ["13+", "firm rule-sets built in"],
          ["0", "blown accounts by surprise"],
          ["∞", "accounts tracked"],
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
            Traditional firms charge <strong className="text-t1">$200–$1,000</strong> for an
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
  const steps = [
    ["01", "Connect your accounts", "Add every funded account across every firm. The cockpit knows each firm's exact drawdown and daily-loss rules out of the box."],
    ["02", "See your Distance to Breach", "Live, per account: how much room you have left before the account dies — and the largest size you can safely take right now."],
    ["03", "Know your edge", "Every trade builds your Trader Score — a transparent read on whether your edge is real, consistent, and worth scaling."],
  ];
  return (
    <section id="how" className="py-16">
      <SectionHead eyebrow="How it works" title="Three things, one job: keep your account alive." />
      <div className="grid md:grid-cols-3 gap-5 mt-9">
        {steps.map(([n, t, d]) => (
          <div key={n} className="card card-hover p-6">
            <div className="mono text-acc text-sm font-semibold">{n}</div>
            <h3 className="text-lg font-semibold mt-3">{t}</h3>
            <p className="text-[.88rem] text-t2 mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreSection() {
  const dims = [
    ["Edge Quality", "Is the edge real and statistically credible? Profit factor, expectancy, and the t-stat that says it isn't just luck.", "#3B82F6"],
    ["Consistency", "Broad-based returns vs. one lucky day. Best-day concentration, winning-day rate, equity-curve smoothness.", "#8B5CF6"],
    ["Discipline", "Behavioral control. Stable bet sizing, no revenge sizing after losses, no escalation inside losing streaks.", "#10B981"],
    ["Drawdown Control", "How you handle pain. Max drawdown depth, recovery factor, and how long you stay underwater.", "#F59E0B"],
  ];
  return (
    <section id="score" className="py-16">
      <SectionHead
        eyebrow="The Trader Score"
        title="A credit score for traders."
        sub="Not win rate. Not risk-reward. A behavioral + statistical fingerprint of your edge — the foundation every funding decision is built on. Fully transparent: you see every metric that moved your number."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-9">
        {dims.map(([t, d, c]) => (
          <div key={t} className="card card-hover p-6">
            <span className="inline-block w-9 h-9 rounded-lg mb-4" style={{ background: c as string, boxShadow: `0 0 22px -4px ${c}` }} />
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
              Better data → sharper underwriting → better traders funded → more institutional capital →
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
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${i >= 4 ? "border-acc/40 bg-acc/[.07]" : "border-white/[.06] bg-white/[.02]"}`}>
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
          <div className="p-4 font-semibold text-t2 border-b border-white/[.07] border-l border-white/[.05]">Traditional prop firm</div>
          <div className="p-4 font-semibold border-b border-white/[.07] border-l border-white/[.05] text-acc">FundedCore</div>
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
  const b = last ? "" : "border-b border-white/[.05]";
  return (
    <>
      <div className={`p-4 text-t2 ${b}`}>{cells[0]}</div>
      <div className={`p-4 text-t3 border-l border-white/[.05] ${b}`}>{cells[1]}</div>
      <div className={`p-4 text-t1 border-l border-white/[.05] bg-acc/[.04] ${b}`}>{cells[2]}</div>
    </>
  );
}

function Faq() {
  const qs = [
    ["Is it really free?", "Yes. Scoring and funding cost you nothing upfront. There's no evaluation fee and no card required. FundedCore earns only its share of profits you actually generate on a funded account."],
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
        <div className="glow" style={{ width: 500, height: 500, background: "radial-gradient(circle,rgba(59,130,246,.25),transparent 70%)", top: -200, left: "50%", transform: "translateX(-50%)", position: "absolute" }} />
        <div className="relative">
          <h2 className="text-3xl md:text-[2.6rem] font-bold leading-tight max-w-2xl mx-auto">
            Stop trading one bad click away from a blown account.
          </h2>
          <p className="text-t2 mt-4 max-w-xl mx-auto">Open the cockpit, add an account, and see your Distance to Breach in under a minute.</p>
          <Link href="/cockpit" className="btn btn-primary text-base !px-8 !py-4 mt-8">Open the Risk Cockpit →</Link>
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
