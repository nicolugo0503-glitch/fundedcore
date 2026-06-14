"use client";
import { type Profile } from "../../lib/profile";
import { Icon } from "../Icon";

export function ProLock({ profile, setProfile, go }: { profile: Profile; setProfile: (p: Profile) => void; go: (id: string) => void }) {
  const feats: [string, string, string][] = [
    ["repeat", "The Mirror", "See what your bad habits cost you — in real dollars — vs. the disciplined you."],
    ["up", "Your Edge", "The exact conditions where YOUR data proves you make money. Trade these."],
  ];
  return (
    <div className="fade max-w-2xl mx-auto">
      <div className="card p-7 md:p-9 text-center relative overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--acc) 35%, var(--line2))" }}>
        <div className="glow" style={{ position: "absolute", width: 420, height: 420, top: -200, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%)", pointerEvents: "none" }} />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "var(--acc-weak)", border: "1px solid color-mix(in srgb, var(--acc) 35%, transparent)", color: "var(--acc)" }}><Icon name="lock" size={26} /></div>
          <div className="eyebrow" style={{ color: "var(--acc)" }}>FundedCore Pro</div>
          <h2 className="text-2xl md:text-[1.9rem] font-bold mt-1.5">Unlock the features that pay for themselves.</h2>
          <p className="text-t2 text-[.95rem] mt-2 max-w-md mx-auto leading-relaxed">Everything else stays free. Pro is the part serious funded traders pay for — what your behavior costs you, and exactly where your edge is.</p>

          <div className="grid sm:grid-cols-2 gap-3 mt-7 text-left">
            {feats.map(([ic, t, d]) => (
              <div key={t} className="rounded-xl p-4 border" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2.5" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}><Icon name={ic} size={17} /></span>
                <div className="font-semibold text-[.92rem]">{t}</div>
                <div className="text-[.8rem] text-t2 mt-1 leading-snug">{d}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setProfile({ ...profile, pro: true })} className="btn btn-primary w-full mt-7 !py-3 text-[.95rem]">Unlock Pro — free during beta →</button>
          <p className="text-[.72rem] text-t3 mt-3">Free while we build it with founding traders. Paid plans come later — you'll be grandfathered.</p>
        </div>
      </div>
    </div>
  );
}
