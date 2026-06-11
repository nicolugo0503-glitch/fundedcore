"use client";
import { useState } from "react";
import { supabase } from "../lib/cloud";
import { Logo } from "./Nav";
import { Icon } from "./Icon";

const AUTH_CSS = `
.auth { min-height:100vh; display:grid; grid-template-columns:1fr; }
@media (min-width:1024px){ .auth { grid-template-columns:1.05fr .95fr; } }
.auth-brand { display:none; position:relative; overflow:hidden; color:#EAF0F7;
  background:
    radial-gradient(900px 500px at 20% 0%, rgba(16,163,127,.20), transparent 60%),
    radial-gradient(700px 600px at 90% 100%, rgba(59,130,246,.16), transparent 60%),
    linear-gradient(160deg,#0A0C10,#0E1217 60%,#0A0C10);
}
@media (min-width:1024px){ .auth-brand { display:flex; flex-direction:column; justify-content:space-between; padding:54px 56px; } }
.auth-brand::before { content:""; position:absolute; inset:0;
  background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:46px 46px; mask-image:radial-gradient(circle at 50% 40%, #000 30%, transparent 80%); }
.auth-eyebrow { font-size:.66rem; letter-spacing:.22em; font-weight:600; color:#2BE3B0; text-transform:uppercase; }
.auth-h2 { font-size:2.3rem; line-height:1.08; font-weight:800; letter-spacing:-.02em; margin-top:16px; max-width:13ch; }
.auth-h2 .g { background:linear-gradient(92deg,#EAF0F7,#2BE3B0); -webkit-background-clip:text; background-clip:text; color:transparent; }
.auth-sub { color:#97A1B0; font-size:.98rem; line-height:1.6; margin-top:18px; max-width:42ch; }
.auth-chart { position:relative; z-index:1; margin-top:34px; }
.auth-chart svg { width:100%; height:120px; display:block; }
.auth-draw { stroke-dasharray:1400; stroke-dashoffset:1400; animation: authdraw 4.5s ease-in-out infinite; }
@keyframes authdraw { 0%{stroke-dashoffset:1400} 55%{stroke-dashoffset:0} 100%{stroke-dashoffset:0} }
.auth-dot { animation: authpulse 1.8s ease-in-out infinite; transform-origin:center; }
@keyframes authpulse { 0%,100%{opacity:.3; r:5} 50%{opacity:0; r:13} }
.auth-feats { display:grid; gap:14px; margin-top:30px; position:relative; z-index:1; }
.auth-feat { display:flex; align-items:center; gap:13px; }
.auth-feat-ic { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center;
  color:#2BE3B0; background:rgba(43,227,176,.10); border:1px solid rgba(43,227,176,.22); flex-shrink:0; }
.auth-feat-t { font-size:.92rem; font-weight:600; color:#EAF0F7; }
.auth-feat-d { font-size:.78rem; color:#7E8A99; }
.auth-foot { font-size:.74rem; color:#5C6675; position:relative; z-index:1; }
/* form side */
.auth-form-wrap { display:flex; align-items:center; justify-content:center; padding:40px 24px; }
.auth-card { width:100%; max-width:380px; }
.auth-seg { display:flex; padding:4px; border-radius:11px; background:var(--panel2); border:1px solid var(--line); margin:22px 0 24px; }
.auth-seg button { flex:1; padding:.6rem 0; border-radius:8px; font-size:.86rem; font-weight:600; color:var(--t3); transition:.18s; }
.auth-seg button.on { background:var(--panel); color:var(--t1); box-shadow:0 1px 3px rgba(0,0,0,.12); }
.auth-title { font-size:1.7rem; font-weight:800; letter-spacing:-.02em; }
.auth-mobilelogo { display:flex; justify-content:center; margin-bottom:6px; }
@media (min-width:1024px){ .auth-mobilelogo{ display:none; } }
.auth-btn { width:100%; padding:.85rem; font-size:.95rem; font-weight:600; margin-top:6px; }
`;

export function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Request timed out — the email service may be rate-limited. Wait a minute and try again.")), ms)),
    ]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === "up") {
        const { data, error } = await withTimeout(supabase.auth.signUp({ email, password: pw }));
        if (error) throw error;
        // Supabase obfuscates existing emails by returning a user with no identities.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMsg({ kind: "err", text: "An account with this email already exists. Sign in instead, or delete it first." });
          return;
        }
        if (!data.session) setMsg({ kind: "ok", text: "Account created. Check your email to confirm, then sign in." });
      } else {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password: pw }));
        if (error) throw error;
      }
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message || "Something went wrong." });
    } finally { setBusy(false); }
  }

  const feats: [string, string, string][] = [
    ["shield", "Distance to Breach", "Live, per account, against each firm's real rules"],
    ["check", "Pre-Trade Gate", "GO / CAUTION / SKIP before you click"],
    ["bolt", "Live Tilt Guard", "Pulls you off the wheel before you blow it"],
    ["gauge", "FundedScore", "Composure + your odds of breaching in 5 days"],
  ];

  return (
    <div className="auth">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />

      {/* ── Brand panel ── */}
      <div className="auth-brand">
        <div style={{ position: "relative", zIndex: 1 }}><Logo size={28} /></div>
        <div>
          <div className="auth-eyebrow">The funded-trader terminal</div>
          <h2 className="auth-h2">See <span className="g">everything</span> before you risk a dollar.</h2>
          <p className="auth-sub">Risk cockpit, pre-trade guardrail, live tilt guard, and your Trader Score — one terminal, built to keep your funded account alive.</p>

          <div className="auth-chart">
            <svg viewBox="0 0 460 120" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="authg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2BE3B0" stopOpacity=".22" /><stop offset="1" stopColor="#2BE3B0" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,96 L46,86 L92,100 L138,72 L184,88 L230,54 L276,76 L322,42 L368,60 L414,26 L460,40 L460,120 L0,120 Z" fill="url(#authg)" />
              <path className="auth-draw" d="M0,96 L46,86 L92,100 L138,72 L184,88 L230,54 L276,76 L322,42 L368,60 L414,26 L460,40" stroke="#2BE3B0" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="460" cy="40" r="3.5" fill="#2BE3B0" />
              <circle className="auth-dot" cx="460" cy="40" r="6" fill="#2BE3B0" />
            </svg>
          </div>

          <div className="auth-feats">
            {feats.map(([ic, t, d]) => (
              <div key={t} className="auth-feat">
                <span className="auth-feat-ic"><Icon name={ic} size={18} /></span>
                <div><div className="auth-feat-t">{t}</div><div className="auth-feat-d">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-foot">Free · no card · your data stays yours.</div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-wrap">
        <div className="auth-card">
          <div className="auth-mobilelogo"><Logo size={26} /></div>
          <h1 className="auth-title">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-t3 text-[.86rem] mt-1.5">Your accounts, trades and history — saved and synced.</p>

          <div className="auth-seg">
            <button type="button" className={mode === "in" ? "on" : ""} onClick={() => { setMode("in"); setMsg(null); }}>Sign in</button>
            <button type="button" className={mode === "up" ? "on" : ""} onClick={() => { setMode("up"); setMsg(null); }}>Sign up</button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <label className="block"><span className="lbl">Email</span><input type="email" required className="inp" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" /></label>
            <label className="block"><span className="lbl">Password</span><input type="password" required minLength={6} className="inp" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
            {msg && <div className="text-[.82rem]" style={{ color: msg.kind === "err" ? "var(--red)" : "var(--grn)" }}>{msg.text}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary auth-btn">{busy ? "…" : mode === "in" ? "Sign in →" : "Create account →"}</button>
          </form>

          <p className="text-t3 text-[.76rem] mt-5 leading-relaxed">
            {mode === "up" ? "Free to start — no credit card. " : ""}
            By continuing you agree this is illustrative software, not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
