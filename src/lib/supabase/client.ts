import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/config/env";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
