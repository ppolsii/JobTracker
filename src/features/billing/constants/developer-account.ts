// Developer Dogfooding: a narrow, explicitly scoped exception so the
// application owner can experience the full Pro plan while building and
// testing Pro-gated features, before the product has any real paying
// customers - not a general mechanism. Consulted from exactly one place,
// `BillingService` (see that file's own comment on its two call sites) -
// nowhere else in the codebase checks this, and no feature gate is ever
// bypassed directly; every Pro-only code path still goes through the exact
// same `BillingService` methods every other user's request does, this only
// changes what those methods decide for one specific account.
//
// Hardcoded rather than an environment variable or a database flag/column,
// deliberately: it must behave identically in every environment regardless
// of which env vars happen to be configured there, and it must only be
// changeable by editing and redeploying this source file, never by
// changing runtime configuration.
//
// To remove this exception once real Pro customers exist: delete this file
// and its two call sites inside `billing.service.ts` (search for
// `isDeveloperAccount`) - nothing else in the codebase references it.
const DEVELOPER_ACCOUNT_EMAIL = "polgoca@gmail.com";

export function isDeveloperAccount(email: string | null | undefined): boolean {
  return email === DEVELOPER_ACCOUNT_EMAIL;
}
