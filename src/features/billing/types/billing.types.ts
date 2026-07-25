import type { Database } from "@/types/supabase";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
export type SubscriptionStatus =
  Database["public"]["Enums"]["subscription_status"];
// Phase 38 (Production Billing): mirrors Stripe's own Price.recurring.interval,
// scoped to the two intervals this application actually sells.
export type BillingInterval =
  Database["public"]["Enums"]["subscription_billing_interval"];
