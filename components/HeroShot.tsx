// The product shot: a crafted, in-perspective "screenshot" of the suite,
// rendered as real DOM so it's crisp at any size. Pure presentation.
export function HeroShot() {
  return (
    <div className="shot-wrap mt-16 max-w-4xl mx-auto px-2">
      <div className="shot relative">
        <div className="browser">
          {/* browser chrome */}
          <div className="browser-bar">
            <span className="browser-dot" style={{ background: "#F87171" }} />
            <span className="browser-dot" style={{ background: "#FBBF24" }} />
            <span className="browser-dot" style={{ background: "#34D399" }} />
            <span className="browser-url">fundedcore.app/suite</span>
            <span className="w-12" />
          </div>

          {/* app body */}
          <div className="grid grid-cols-[52px_1fr] md:grid-cols-[160px_1fr] text-left">
            {/* rail */}
            <div className="border-r border-white/[.07] p-2 space-y-1">
              {["◎ Brief", "● Today", "◫ Charts", "🛡 Risk", "✦ Insights", "◷ News"].map((x, i) => (
                <div key={x} className={`text-[.68rem] px-2 py-1.5 rounded-lg truncate ${i === 0 ? "text-white bg-gradient-to-r from-[#5B8CFF26] to-[#8B5CF61a] border border-[#5B8CFF45]" : "text-[#8B9AB8]"}`}>
                  <span className="hidden md:inline">{x}</span><span className="md:hidden">{x.slice(0, 1)}</span>
                </div>
              ))}
            </div>

            {/* content */}
            <div className="p-4 md:p-5 space-y-3">
              {/* header row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[.6rem] uppercase tracking-[.18em]" style={{ color: "#5B8CFF" }}>Friday · pre-market brief</div>
                  <div className="display text-[1.05rem] text-white">Before you trade today, Maya.</div>
                </div>
                <span className="text-[.62rem] px-2 py-1 rounded-full border" style={{ borderColor: "#34D39955", color: "#34D399" }}>● 3 accounts healthy</span>
              </div>

              {/* gauges row */}
              <div className="grid grid-cols-3 gap-3">
                {/* DTB gauge */}
                <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-3 flex flex-col items-center">
                  <svg width="86" height="60" viewBox="0 0 100 64">
                    <path d="M10 58 A 42 42 0 1 1 90 58" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="9" strokeLinecap="round" />
                    <path d="M10 58 A 42 42 0 1 1 90 58" fill="none" stroke="url(#hg)" strokeWidth="9" strokeLinecap="round" strokeDasharray="132 200" />
                    <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#34D399" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
                    <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700" fontFamily="JetBrains Mono">$1,820</text>
                  </svg>
                  <div className="text-[.58rem] uppercase tracking-wider text-[#7C8BA8]">distance to breach</div>
                </div>
                {/* equity spark */}
                <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-3 col-span-2">
                  <div className="flex justify-between text-[.6rem] text-[#7C8BA8] uppercase tracking-wider"><span>equity</span><span style={{ color: "#34D399" }}>+$2,640</span></div>
                  <svg width="100%" height="46" viewBox="0 0 300 46" preserveAspectRatio="none">
                    <defs><linearGradient id="he" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#34D399" stopOpacity=".3" /><stop offset="1" stopColor="#34D399" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 38 L20 34 L40 36 L60 28 L85 31 L110 22 L135 26 L160 18 L185 21 L210 12 L240 16 L270 8 L300 10 L300 46 L0 46 Z" fill="url(#he)" />
                    <path d="M0 38 L20 34 L40 36 L60 28 L85 31 L110 22 L135 26 L160 18 L185 21 L210 12 L240 16 L270 8 L300 10" fill="none" stroke="#34D399" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* accounts row */}
              <div className="grid grid-cols-3 gap-3">
                {[["Apex #1", "$820", "#FBBF24", 41], ["TopStep XFA", "$2,600", "#34D399", 86], ["Apex Eval", "$1,410", "#34D399", 64]].map(([n, d, c, w]) => (
                  <div key={n as string} className="rounded-xl border border-white/[.08] bg-white/[.03] p-2.5">
                    <div className="flex justify-between items-center text-[.62rem]"><span className="text-white font-medium">{n}</span><span style={{ color: c as string }}>●</span></div>
                    <div className="mono text-[.8rem] font-bold mt-0.5" style={{ color: c as string }}>{d}</div>
                    <div className="h-1 rounded-full bg-white/[.08] mt-1.5"><div className="h-full rounded-full" style={{ width: `${w}%`, background: c as string }} /></div>
                  </div>
                ))}
              </div>

              {/* alert */}
              <div className="rounded-xl px-3 py-2 text-[.66rem] font-medium flex items-center gap-2" style={{ background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.35)", color: "#FBBF24" }}>
                ⚠ CPI in 14m — no-trade window. Flatten or sit out.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
