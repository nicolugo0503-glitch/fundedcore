import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  let r: any = null;
  if (SB_URL && SB_KEY && id) {
    try { const db = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } }); const { data } = await db.from("verifications").select("*").eq("id", id).single(); r = data; } catch {}
  }
  const grade = r?.grade || "—";
  const comp = r ? Math.round(r.composure) : 0;
  const top = r ? Math.max(1, 100 - Math.round(r.rank_percentile || 0)) : 0;
  const col = comp >= 75 ? "#2BE3B0" : comp >= 55 ? "#F5A623" : "#EF4444";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#070A0E"/>
<defs><radialGradient id="g" cx="0.5" cy="0.15" r="0.8"><stop offset="0" stop-color="#0E1A18" stop-opacity="0.9"/><stop offset="1" stop-color="#070A0E" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#g)"/>
<text x="600" y="130" fill="#EAF0F7" font-family="Arial" font-size="44" font-weight="800" text-anchor="middle">FundedCore</text>
<text x="600" y="180" fill="#7B8694" font-family="Arial" font-size="24" font-weight="700" letter-spacing="6" text-anchor="middle">VERIFIED FUNDEDSCORE</text>
<text x="600" y="400" fill="${col}" font-family="Arial" font-size="240" font-weight="800" text-anchor="middle">${grade}</text>
<text x="600" y="490" fill="#EAF0F7" font-family="Arial" font-size="56" font-weight="800" text-anchor="middle">Top ${top}% of funded traders</text>
<text x="600" y="560" fill="#97A1B0" font-family="Arial" font-size="30" text-anchor="middle">Composure ${comp}/100${r?.sample_trades ? " &#183; " + r.sample_trades + " trades" : ""}</text>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=300" } });
}
