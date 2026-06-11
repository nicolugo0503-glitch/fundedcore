// Self-serve account deletion. Verifies the caller's own access token, then uses
// the service role to remove their profile row + their auth user — which frees the
// email to sign up again. A user can ONLY delete themselves (token-scoped).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Account deletion isn't configured yet (add SUPABASE_SERVICE_ROLE_KEY in Vercel)." }, { status: 503 });
  }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Identify the caller from their own token — this is what scopes the delete to self.
  const { data: u, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !u?.user) return NextResponse.json({ error: "Your session is invalid — sign in again." }, { status: 401 });
  const uid = u.user.id;

  // Remove their synced data, then the auth user itself.
  await admin.from("profiles").delete().eq("user_id", uid);
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
