// Production Readiness Audit (IMPLEMENTATION_ORDER_V2.md Phase 39):
// "Prepare hooks for: Sentry, Analytics, Performance monitoring. Without
// requiring vendor lock-in." A thin, vendor-agnostic facade - every call
// site in this app depends on the three functions below, never on a
// specific vendor's SDK. Today they only log to the server console (no new
// dependency, nothing to configure); wiring up a real provider later (e.g.
// `@sentry/nextjs`, PostHog, Vercel Analytics/Speed Insights) means editing
// the three function bodies in this one file, never the call sites.
//
// Deliberately NOT wired into every existing try/catch in the codebase -
// this phase's own "no unnecessary refactoring" - only into the new
// `error.tsx` boundary, the one place an unhandled exception has nowhere
// else to go. Adopting it elsewhere (e.g. inside `BillingCheckoutService`'s
// existing `console.error` calls) is a natural, low-risk follow-up, not
// required for this to be useful today.

type MonitoringContext = Record<string, string | number | boolean | null | undefined>;

// Report an unexpected exception. Call this from error boundaries and
// top-level catch blocks - not for expected, already-handled business
// errors (an `ActionResult` failure is not an "exception").
export function captureException(error: unknown, context?: MonitoringContext): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[monitoring] exception:", message, context ?? {});
  // Real provider integration point, e.g.:
  //   Sentry.captureException(error, { extra: context });
}

// Report a noteworthy event that isn't an exception (e.g. "webhook event
// type not handled", a degraded-but-recovered path).
export function captureMessage(message: string, context?: MonitoringContext): void {
  console.info("[monitoring] message:", message, context ?? {});
  // Real provider integration point, e.g.:
  //   Sentry.captureMessage(message, { level: "info", extra: context });
}

// Track a product analytics event (e.g. "checkout_started"). Distinct from
// the two above - this is business telemetry, not error reporting.
export function trackEvent(name: string, properties?: MonitoringContext): void {
  console.info("[monitoring] event:", name, properties ?? {});
  // Real provider integration point, e.g.:
  //   posthog.capture(name, properties);
  //   or Vercel Analytics' `track(name, properties)`.
}
