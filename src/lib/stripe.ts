import Stripe from "stripe";

import { env } from "@/config/env";
import type { BillingInterval } from "@/features/billing/types/billing.types";

// Thin infrastructure wrapper only (IMPLEMENTATION_ORDER_V2.md Phase 23,
// extended Phase 38) - no business logic here. The client is constructed
// lazily (not at module load) so importing this file - which Next.js does
// while collecting Route Handler exports during `next build` - never fails
// just because Stripe isn't configured in this environment yet. Used by
// app/api/webhooks/stripe/route.ts and BillingCheckoutService.
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

// "STRIPE PRODUCTS": "Products and Prices must be configurable through
// environment variables. Never hardcode Price IDs." The only place either
// price id is read - BillingCheckoutService never touches
// process.env/STRIPE_PRO_*_PRICE_ID directly.
export function getStripeProPriceId(interval: BillingInterval): string {
  const priceId =
    interval === "month"
      ? env.stripeProMonthlyPriceId
      : env.stripeProYearlyPriceId;

  if (!priceId) {
    const variableName =
      interval === "month"
        ? "STRIPE_PRO_MONTHLY_PRICE_ID"
        : "STRIPE_PRO_YEARLY_PRICE_ID";
    throw new Error(`Missing required environment variable: ${variableName}`);
  }

  return priceId;
}
