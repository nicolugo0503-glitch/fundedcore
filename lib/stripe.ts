// Server-side Stripe client. Activates only when STRIPE_SECRET_KEY + STRIPE_PRICE_ID
// are set in the environment; otherwise the app stays free (beta) and nothing breaks.
import Stripe from "stripe";
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;
export const PRICE_ID = process.env.STRIPE_PRICE_ID || "";
export const stripeReady = !!(stripe && PRICE_ID);
