import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];

// Only this module may write to the subscriptions table, aside from the
// handle_new_user trigger's genesis row - and the only reader/writer of
// stripe_webhook_events. Uses the admin (service-role) client because the
// caller (Stripe's webhook) has no Supabase session for RLS to check - see
// src/lib/supabase/admin.ts. Kept in a separate file from BillingRepository
// (which never uses the admin client) so this elevated-privilege path stays
// easy to find and audit in isolation - the same reason AuthBrowserRepository
// was split from AuthRepository.
export const BillingWebhookRepository = {
  // "checkout.session.completed" is the one moment a stripe_customer_id is
  // first linked to a user - Checkout's `client_reference_id` carries our
  // own userId, resolved back to a row here. `is("stripe_customer_id", null)`
  // guards against ever overwriting an already-linked row with a different
  // id (should never happen in practice, but never trust a webhook payload
  // to be the only safeguard against corrupting a working link).
  async linkStripeCustomer(userId: string, stripeCustomerId: string) {
    const supabase = createAdminClient();
    return supabase
      .from("subscriptions")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("user_id", userId)
      .is("stripe_customer_id", null);
  },

  // Updates only - never creates a row. A stripe_customer_id with no
  // matching row means Checkout hasn't linked it to a user yet (see
  // linkStripeCustomer above, which now closes that gap for new
  // subscriptions) - there is still no reliable way to determine which user
  // an unmapped customer id belongs to from a webhook payload alone, so an
  // update matching zero rows is a safe, intentional no-op.
  async syncByStripeCustomerId(
    stripeCustomerId: string,
    fields: Partial<SubscriptionUpdate>
  ) {
    const supabase = createAdminClient();
    return supabase
      .from("subscriptions")
      .update(fields)
      .eq("stripe_customer_id", stripeCustomerId);
  },

  // "WEBHOOKS": "All webhook handlers must be idempotent." Recorded AFTER a
  // Stripe event has been fully, successfully processed (never before) - a
  // genuine retry of an already-processed event is then recognized and
  // skipped via the unique primary key, while a failed attempt (never
  // recorded) remains retryable on Stripe's next redelivery. A true
  // concurrent double-delivery of the same event racing past the
  // "already processed?" check is a rare, accepted edge case: every sync
  // this Service performs sets columns to their latest known state (never
  // increments/appends), so processing the same event twice is harmless.
  async hasProcessedEvent(eventId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    return data !== null;
  },

  async recordProcessedEvent(eventId: string, type: string) {
    const supabase = createAdminClient();
    return supabase.from("stripe_webhook_events").insert({ id: eventId, type });
  },
};
