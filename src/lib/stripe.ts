import Stripe from "stripe";

import { env } from "@/config/env";

// Thin infrastructure wrapper only (IMPLEMENTATION_ORDER_V2.md Phase 23) -
// no business logic here. The client is constructed lazily (not at module
// load) so importing this file - which Next.js does while collecting Route
// Handler exports during `next build` - never fails just because Stripe
// isn't configured in this environment yet. Used only by
// app/api/webhooks/stripe/route.ts.
let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!client) {
    if (!env.stripeSecretKey) {
      throw new Error(
        "Missing required environment variable: STRIPE_SECRET_KEY"
      );
    }
    client = new Stripe(env.stripeSecretKey);
  }
  return client;
}

export function getStripeWebhookSecret(): string {
  if (!env.stripeWebhookSecret) {
    throw new Error(
      "Missing required environment variable: STRIPE_WEBHOOK_SECRET"
    );
  }
  return env.stripeWebhookSecret;
}
