import Stripe from "stripe";

import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return Response.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Signature manquante." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const memberId = session.metadata?.memberId;
    if (memberId) {
      await updateStore((data) => {
        data.plan = "pro";
        data.settings.updatedAt = new Date().toISOString();
      }, memberId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const memberId = subscription.metadata?.memberId;
    if (memberId) {
      await updateStore((data) => {
        data.plan = "free";
        data.settings.updatedAt = new Date().toISOString();
      }, memberId);
    }
  }

  return Response.json({ received: true });
}
