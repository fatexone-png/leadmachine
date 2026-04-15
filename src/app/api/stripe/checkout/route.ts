import Stripe from "stripe";

import { getSession } from "@/lib/session";
import { readStore } from "@/lib/store";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PRO;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!stripeKey || !priceId) {
    return Response.json({ error: "Paiement non configuré." }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const data = await readStore(session.memberId);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: data.linkedin.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { memberId: session.memberId },
    success_url: `${appUrl}/workspace?upgrade=success`,
    cancel_url: `${appUrl}/workspace`,
    locale: "fr",
    allow_promotion_codes: true,
  });

  return Response.json({ url: checkoutSession.url });
}
