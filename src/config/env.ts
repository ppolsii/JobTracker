function requireEnvVar(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnvVar(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  supabaseAnonKey: requireEnvVar(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  // Optional per DEPLOYMENT.md; used to build absolute redirect URLs (e.g.
  // the password reset email link) outside of a request context.
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Optional: only the billing webhook Route Handler (Phase 23) depends on
  // these. Left undefined (not requireEnvVar'd) rather than failing the
  // whole app at build/start time, since no other code path touches them
  // yet - see lib/stripe.ts and lib/supabase/admin.ts, which each fail
  // fast themselves, but only when actually invoked.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;
