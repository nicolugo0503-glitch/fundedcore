"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { supabase } from "../../lib/cloud";
import { Icon } from "../Icon";

const HARD_PAYWALL = process.env.NEXT_PUBLIC_PAYWALL_HARD === "1";

export function ProLock({ profile, setProfile, go }: { profile: Profile; setProfile: (p: Profile) => void; go: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const feats: [string, string, string][] = [
    ["repeat", "The Mirror", "See what your bad habits cost you — in real dollars — vs. the disciplined you."],
    ["up", "Your Edge", "The exact conditions where YOUR data proves you make money. Trade these."],
  ];

  async function upgrade() {
    setBusy(true); setMsg("");
    try {
      if (!supabase) { setMsg("Sign in (cloud sync) is required to subscribe."); setBusy(false); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setMsg("Please sign in first, then upgrade."); setBusy(false); return; }
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const j = await r.json();
      if (j.url) { window.location.href = j.url; return; }
      setMsg(j.error || "Could not start checkout.");
    } catch (e: any) { setMsg(e?.message || "Could not start checkout."); }
    setBusy(false);
  }

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

          <div className="mt-7 flex items-baseline justify-center gap-2">
            <span className="text-3xl font-bold">$29</span><span className="text-t2 text-sm">/mo</span>
            <span className="ml-2 text-[.72rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--acc-weak)", color: "var(--acc)" }}>founding: $19/mo with code</span>
          </div>
          <button onClick={upgrade} disabled={busy} className="btn btn-primary w-full mt-3 !py-3 text-[.95rem]">{busy ? "Starting checkout…" : "Upgrade to Pro →"}</button>
          {msg && <p className="text-[.8rem] mt-2" style={{ color: "var(--red)" }}>{msg}</p>}
          <p className="text-[.72rem] text-t3 mt-3">Cancel anytime. Secure checkout by Stripe.</p>

          {!HARD_PAYWALL && (
            <button onClick={() => setProfile({ ...profile, pro: true })} className="mt-4 text-[.78rem] underline" style={{ color: "var(--t3)" }}>Founding tester? Unlock free during beta</button>
          )}
        </div>
      </div>
    </div>
  );
}
