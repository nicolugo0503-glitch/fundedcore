import Link from "next/link";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <path d="M9 21V11h8M9 16h6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22.5" cy="20.5" r="2.6" fill="#fff" />
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#3B82F6" /><stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[1.05rem] font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>
        Funded<span className="text-acc">Core</span>
      </span>
    </span>
  );
}

export function Nav({ cta = true }: { cta?: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/70 border-b border-white/[.06]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-t2">
          <a href="/#how" className="hover:text-t1 transition">How it works</a>
          <a href="/#score" className="hover:text-t1 transition">Trader Score</a>
          <a href="/#economics" className="hover:text-t1 transition">Economics</a>
          <Link href="/dashboard" className="hover:text-t1 transition">Dashboard</Link>
        </nav>
        {cta && (
          <Link href="/apply" className="btn btn-primary !py-2 !px-4 text-sm">
            Get scored — free
          </Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[.06] mt-24">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between text-sm text-t3">
        <div className="flex items-center gap-3"><Logo size={22} /></div>
        <p className="max-w-xl leading-relaxed">
          FundedCore is an early-stage product. Scores and funding decisions shown here are
          illustrative and generated from a demonstration model. Nothing here is financial advice
          or an offer of capital. Trading futures involves substantial risk of loss.
        </p>
        <p>© {new Date().getFullYear()} FundedCore</p>
      </div>
    </footer>
  );
}
