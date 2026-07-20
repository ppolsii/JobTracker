import { createClient } from "@/lib/supabase/server";

const SUBSCRIPTION_COLUMNS =
  "id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at";

// Only this module may query the subscriptions table for user-scoped reads
// (ADR-008). Every user has exactly one row (handle_new_user creates it at
// signup - see the Phase 23 migration), so this is always a single-row
// read, protected by RLS exactly like every other user-owned table.
export const BillingRepository = {
  async getByUserId(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
  },
};
