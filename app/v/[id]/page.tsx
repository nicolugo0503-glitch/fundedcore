// Public "Verified by FundedCore" credential page. Server-rendered; reads the record
// from the DB by opaque id so values can't be forged via the URL.
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getRecord(id: string) {
  if (!URL || !KEY) return null;
  try {
    const db = createClient(URL, KEY, { auth: { persistSession: false } });
    const { data } = await db.from("verifications").select("*").eq("id", id).single();
    return data || null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await getRecord(params.id);
  const title = r ? `${r.handle || "A funded trader"} — FundedCore ${r.grade} (top ${Math.max(1, 100 - Math.round(r.rank_percentile || 0))}%)` : "Verified by FundedCore";
  const desc = r ? `Composure ${Math.round(r.composure)}/100, verified from ${r.sample_trades || "real"} trades. The discipline credential for funded traders.` : "The discipline credential for funded traders.";
  return { title, description: desc, openGraph: { title, description: desc, images: [`/api/verify/badge?id=${params.id}`] }, twitter: { card: "summary_large_image", title, description: desc } };
}

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const r = await getRecord(params.id);
  const wrap: any = { minHeight: "100vh", background: "radial-gradient(900px 500px at 50% 0%, #0E1A18, #070A0E 60%)", color: "#EAF0F7", fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 };
  if (!r) return (<main style={wrap}><div style={{ fontWeight: 900, fontSize: 24 }}>Funded<span style={{ color: "#2BE3B0" }}>Core</span></div><p style={{ color: "#97A1B0", marginTop: 12 }}>This credential isn’t available.</p><a href="https://funded-core.com" style={{ color: "#2BE3B0", marginTop: 8 }}>funded-core.com</a></main>);
  const pct = Math.round(r.rank_percentile || 0);
  const top = Math.max(1, 100 - pct);
  const gColor = r.composure >= 75 ? "#2BE3B0" : r.composure >= 55 ? "#F5A623" : "#EF4444";
  const issued = r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  return (
    <main style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 22, marginBottom: 26 }}>Funded<span style={{ color: "#2BE3B0" }}>Core</span></div>
      <div style={{ width: "min(440px,92vw)", background: "#0E1216", border: "1px solid rgba(255,255,255,.1)", borderRadius: 24, padding: 34, textAlign: "center", boxShadow: "0 40px 120px -30px rgba(0,0,0,.7)" }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: "#7B8694", fontWeight: 800 }}>VERIFIED FUNDEDSCORE</div>
        <div style={{ fontSize: 96, fontWeight: 900, color: gColor, lineHeight: 1.05, marginTop: 10 }}>{r.grade}</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Top {top}% of funded traders</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 22 }}>
          <div><div style={{ fontSize: 30, fontWeight: 800, color: gColor }}>{Math.round(r.composure)}</div><div style={{ fontSize: 12, color: "#7B8694" }}>COMPOSURE</div></div>
          <div><div style={{ fontSize: 30, fontWeight: 800 }}>{r.sample_trades || "—"}</div><div style={{ fontSize: 12, color: "#7B8694" }}>TRADES</div></div>
        </div>
        {r.handle && <div style={{ marginTop: 20, fontSize: 15, color: "#97A1B0" }}>@{r.handle}</div>}
        <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2BE3B0", border: "1px solid rgba(43,227,176,.3)", borderRadius: 999, padding: "5px 12px" }}>✓ Verified by FundedCore{issued ? ` · ${issued}` : ""}</div>
      </div>
      <a href="https://funded-core.com" style={{ marginTop: 24, color: "#2BE3B0", fontWeight: 700, textDecoration: "none" }}>Get your score → funded-core.com</a>
    </main>
  );
}
