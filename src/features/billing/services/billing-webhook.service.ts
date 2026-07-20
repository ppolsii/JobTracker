import type Stripe from "stripe";

import { BillingWebhookRepository } from "@/features/billing/repositories/billing-webhook.repository";

// Orchestrates the one caller this Service exists for
// (app/api/webhooks/stripe/route.ts): translate an already signature-
// verified Stripe event into the subscriptions table's own columns, then
// delegate the write to BillingWebhookRepository. Purely mechanical field
// mapping - Stripe's own `status` values are stored as-is (the
// subscription_status enum mirrors them exactly), never reinterpreted into
// a business meaning, and `plan` is never touched here at all
// (IMPLEMENTATION_ORDER_V2.md Phase 23: "no business logic should depend
// on it yet").
const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export const BillingWebhookService = {
  async handleEvent(event: Stripe.Event): Promise<void> {
    if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
      return;
    }

    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const periodEnd = subscription.items.data[0]?.current_period_end;

    await BillingWebhookRepository.syncByStripeCustomerId(customerId, {
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    });
  },
};
