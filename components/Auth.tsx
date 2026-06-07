"use client";
import { useState } from "react";
import { supabase } from "../lib/cloud";
import { Logo } from "./Nav";

export function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (!data.session) setMsg({ kind: "ok", text: "Account created. Check your email to confirm, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (err: any) {
      setMsg({ kind: "err", text: err?.message || "Something went wrong." });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="card p-7 w-full max-w-sm relative z-10">
        <div className="flex justify-center mb-5"><Logo size={26} /></div>
        <h1 className="display text-[1.4rem] font-bold text-center">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-t3 text-[.82rem] text-center mt-1 mb-5">Your accounts, trades and history — saved and synced.</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block"><span className="lbl">Email</span><input type="email" required className="inp" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></label>
          <label className="block"><span className="lbl">Password</span><input type="password" required minLength={6} className="inp" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" /></label>
          {msg && <div className="text-[.8rem]" style={{ color: msg.kind === "err" ? "var(--red)" : "var(--grn)" }}>{msg.text}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "…" : mode === "in" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="text-center text-[.82rem] text-t3 mt-4">
          {mode === "in" ? <>No account? <button onClick={() => { setMode("up"); setMsg(null); }} className="text-acc">Sign up</button></>
            : <>Have an account? <button onClick={() => { setMode("in"); setMsg(null); }} className="text-acc">Sign in</button></>}
        </div>
      </div>
    </div>
  );
}
