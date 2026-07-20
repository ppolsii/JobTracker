import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/features/billing/types/billing.types";

// The only module that writes to the subscriptions table, aside from the
// handle_new_user trigger's genesis row. Uses the admin (service-role)
// client because the caller (Stripe's webhook) has no Supabase session for
// RLS to check - see src/lib/supabase/admin.ts. Kept in a separate file
// from BillingRepository (which never uses the admin client) so this
// elevated-privilege path stays easy to find and audit in isolation - the
// same reason AuthBrowserRepository was split from AuthRepository.
export const BillingWebhookRepository = {
  // Updates only - never creates a row. A stripe_customer_id with no
  // matching row means Checkout (Phase 24) hasn't linked it to a user yet;
  // there is no reliable way to determine which user it belongs to from a
  // webhook payload alone, so this is a safe, intentional no-op until then.
  async syncByStripeCustomerId(
    stripeCustomerId: string,
    fields: {
      stripe_subscription_id: string;
      status: SubscriptionStatus;
      current_period_end: string | null;
    }
  ) {
    const supabase = createAdminClient();
    return supabase
      .from("subscriptions")
      .update(fields)
      .eq("stripe_customer_id", stripeCustomerId);
  },
};
