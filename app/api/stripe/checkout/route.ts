// Create a Stripe Checkout Session for a FundedCore Pro subscription.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, PRICE_ID, stripeReady } from "../../../../lib/stripe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeReady || !stripe) return NextResponse.json({ error: "Payments aren't set up yet (add STRIPE_SECRET_KEY + STRIPE_PRICE_ID in Vercel).", notConfigured: true }, { status: 503 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sk) return NextResponse.json({ error: "Sign-in isn't fully configured (missing service role key)." }, { status: 503 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in first to upgrade." }, { status: 401 });

  const admin = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u?.user) return NextResponse.json({ error: "Your session expired — sign in again." }, { status: 401 });
  const uid = u.user.id, email = u.user.email || undefined;
  const origin = req.headers.get("origin") || "https://funded-core.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      client_reference_id: uid,
      customer_email: email,
      metadata: { uid },
      subscription_data: { metadata: { uid } },
      allow_promotion_codes: true,
      success_url: origin + "/suite?pro=success",
      cancel_url: origin + "/suite?pro=cancel",
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not start checkout." }, { status: 500 });
  }
}
