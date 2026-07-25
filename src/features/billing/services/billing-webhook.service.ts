import type Stripe from "stripe";

import { BillingWebhookRepository } from "@/features/billing/repositories/billing-webhook.repository";
import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/features/billing/types/billing.types";
import { getStripeClient } from "@/lib/stripe";
import type { Database } from "@/types/supabase";

type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];

// Orchestrates the one caller this Service exists for
// (app/api/webhooks/stripe/route.ts): translate an already signature-
// verified Stripe event into the subscriptions table's own columns, then
// delegate the write to BillingWebhookRepository. Every subscription-shaped
// event (created/updated/deleted/resumed/paused) shares one sync path below -
// Stripe's payload for each is always the subscription's full current state,
// never a delta, so there is exactly one place this mapping happens
// ("avoid duplicated logic").
const SUBSCRIPTION_SYNC_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.resumed",
  "customer.subscription.paused",
]);

const INVOICE_EVENT_TYPES = new Set([
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

const HANDLED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  ...SUBSCRIPTION_SYNC_EVENT_TYPES,
  ...INVOICE_EVENT_TYPES,
]);

function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customer === "string" ? customer : customer.id;
}

// BUSINESS_RULES.md "Billing": "A user is on the Pro plan when, and only
// when, their subscription's `plan` column is `pro`." This is the one place
// that rule is decided from Stripe's own status - never reinterpreted
// anywhere else. `past_due` deliberately still grants Pro (a grace period
// while a failed payment can be retried through the Customer Portal - see
// "PAYMENT FAILURE": "Allow retry through Customer Portal," which would be
// a hollow promise if access were revoked the instant a charge failed).
// `incomplete` (the very first payment hasn't succeeded yet) never grants
// access - Pro is earned by a successful charge, not merely starting
// Checkout.
function derivePlanFromStatus(status: SubscriptionStatus): SubscriptionPlan {
  return status === "trialing" || status === "active" || status === "past_due"
    ? "pro"
    : "free";
}

function buildSubscriptionFields(
  subscription: Stripe.Subscription
): Partial<SubscriptionUpdate> {
  const item = subscription.items.data[0];
  const periodEndSeconds = item?.current_period_end;
  const interval = item?.price?.recurring?.interval;
  const cancellationSeconds = subscription.cancel_at ?? subscription.canceled_at;
  const latestInvoice = subscription.latest_invoice;

  return {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan: derivePlanFromStatus(subscription.status),
    current_period_end: periodEndSeconds
      ? new Date(periodEndSeconds * 1000).toISOString()
      : null,
    billing_interval:
      interval === "month" || interval === "year" ? interval : null,
    cancel_at: cancellationSeconds
      ? new Date(cancellationSeconds * 1000).toISOString()
      : null,
    latest_invoice_id:
      typeof latestInvoice === "string"
        ? latestInvoice
        : (latestInvoice?.id ?? null),
  };
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = resolveCustomerId(subscription.customer);
  const { error } = await BillingWebhookRepository.syncByStripeCustomerId(
    customerId,
    buildSubscriptionFields(subscription)
  );

  if (error) {
    throw new Error(
      `Failed to sync subscription ${subscription.id} for customer ${customerId}: ${error.message}`
    );
  }
}

// "checkout.session.completed" is the only moment a stripe_customer_id is
// first linked to a user - `client_reference_id` was set to our own userId
// when the Checkout Session was created (BillingCheckoutService). The
// subscription itself is then fetched and synced through the same shared
// path every other subscription event uses, rather than mapping the
// session's own (partial) shape a second time.
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId = session.customer
    ? resolveCustomerId(session.customer)
    : null;

  if (session.client_reference_id && customerId) {
    await BillingWebhookRepository.linkStripeCustomer(
      session.client_reference_id,
      customerId
    );
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  // "Missing Subscription": a Checkout Session not in subscription mode has
  // none - this application never creates one of those, but a webhook
  // handler must not assume its own client's intent from the payload alone.
  if (!subscriptionId) {
    console.warn(
      `checkout.session.completed ${session.id} has no subscription - skipping.`
    );
    return;
  }

  const subscription = await getStripeClient().subscriptions.retrieve(
    subscriptionId
  );
  await syncSubscription(subscription);
}

// invoice.payment_succeeded/failed: `status` is already kept correct by the
// subscription.updated event Stripe fires alongside a failed/recovered
// renewal (a failed charge moves the subscription to `past_due`, which
// derivePlanFromStatus already accounts for) - re-deciding entitlements
// here would be a second, redundant place for the same rule. This handler
// only records the invoice id for reference/support.
async function handleInvoiceEvent(invoice: Stripe.Invoice): Promise<void> {
  // "Missing Customer": nothing to sync against.
  if (!invoice.customer) {
    console.warn(`Invoice ${invoice.id} has no customer - skipping.`);
    return;
  }

  const customerId = resolveCustomerId(invoice.customer);
  const { error } = await BillingWebhookRepository.syncByStripeCustomerId(
    customerId,
    { latest_invoice_id: invoice.id }
  );

  if (error) {
    throw new Error(
      `Failed to record invoice ${invoice.id} for customer ${customerId}: ${error.message}`
    );
  }
}

export const BillingWebhookService = {
  async handleEvent(event: Stripe.Event): Promise<void> {
    if (!HANDLED_EVENT_TYPES.has(event.type)) {
      return;
    }

    // "WEBHOOKS": "All webhook handlers must be idempotent." / "Duplicate
    // Events" - see BillingWebhookRepository.hasProcessedEvent's own note on
    // why this is checked before, and recorded only after, processing.
    if (await BillingWebhookRepository.hasProcessedEvent(event.id)) {
      console.info(
        `Stripe event ${event.id} (${event.type}) already processed - skipping duplicate delivery.`
      );
      return;
    }

    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
    } else if (SUBSCRIPTION_SYNC_EVENT_TYPES.has(event.type)) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    } else if (INVOICE_EVENT_TYPES.has(event.type)) {
      await handleInvoiceEvent(event.data.object as Stripe.Invoice);
    }

    await BillingWebhookRepository.recordProcessedEvent(event.id, event.type);
  },
};
