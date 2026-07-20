import type { Database } from "@/types/supabase";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
export type SubscriptionStatus =
  Database["public"]["Enums"]["subscription_status"];
