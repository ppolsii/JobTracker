import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/config/env";
import type { Database } from "@/types/supabase";

// Bypasses Row Level Security entirely (the service-role key, not the anon
// key) - never expose this client to a browser, never call it from
// anywhere that isn't already authenticated by some other means.
// IMPLEMENTATION_ORDER_V2.md Phase 23: the billing webhook Route Handler
// is the first and, for now, only caller. Stripe's signature verification
// is that request's authentication - the request carries no Supabase
// session, so no RLS policy could safely allow the write instead.
// ARCHITECTURE.md "Security": "Never expose Service Role Key." Constructed
// lazily (not at module load) so importing this file never fails just
// because the key isn't configured in this environment yet.
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createSupabaseClient<Database>(
    env.supabaseUrl,
    env.supabaseServiceRoleKey
  );
}
