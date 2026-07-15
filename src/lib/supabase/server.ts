import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/config/env";
import type { Database } from "@/types/supabase";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component. Safe to ignore because the
          // middleware is responsible for refreshing the session.
        }
      },
    },
  });
}
