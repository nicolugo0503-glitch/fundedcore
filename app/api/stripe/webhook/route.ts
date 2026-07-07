// Stripe webhook — the source of truth for Pro access. Flips profiles.data.pro
// on/off based on subscription lifecycle. Verifies the Stripe signature.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../../lib/stripe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function setPro(uid: string, val: boolean, customerId?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sk || !uid) return;
  const admin = createClient(url, sk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin.from("profiles").select("data").eq("user_id", uid).maybeSingle();
  const prof: any = (data?.data as any) || {};
  prof.pro = val;
  if (customerId) prof.stripeCustomerId = customerId;
  await admin.from("profiles").upsert({ user_id: uid, data: prof, updated_at: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whsec) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: any;
  try { event = stripe.webhooks.constructEvent(raw, sig, whsec); }
  catch (e: any) { return NextResponse.json({ error: "bad signature: " + (e?.message || "") }, { status: 400 }); }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const uid = s.client_reference_id || s.metadata?.uid;
      if (uid) await setPro(uid, true, typeof s.customer === "string" ? s.customer : undefined);
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const uid = sub.metadata?.uid;
      const active = ["active", "trialing"].includes(sub.status);
      if (uid) await setPro(uid, active, typeof sub.customer === "string" ? sub.customer : undefined);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      if (sub.metadata?.uid) await setPro(sub.metadata.uid, false);
    }
  } catch (e: any) { return NextResponse.json({ error: e?.message || "handler-failed" }, { status: 500 }); }
  return NextResponse.json({ received: true });
}
