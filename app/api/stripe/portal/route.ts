// Stripe billing portal — lets a Pro subscriber manage/cancel their plan.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, stripeReady } from "../../../../lib/stripe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeReady || !stripe) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sk) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return NextResponse.json({ error: "Session expired." }, { status: 401 });

  const { data } = await admin.from("profiles").select("data").eq("user_id", u.user.id).maybeSingle();
  let customer = (data?.data as any)?.stripeCustomerId as string | undefined;
  if (!customer && u.user.email) {
    const list = await stripe.customers.list({ email: u.user.email, limit: 1 });
    customer = list.data[0]?.id;
  }
  if (!customer) return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  const origin = req.headers.get("origin") || "https://funded-core.com";
  const portal = await stripe.billingPortal.sessions.create({ customer, return_url: origin + "/suite" });
  return NextResponse.json({ url: portal.url });
}
