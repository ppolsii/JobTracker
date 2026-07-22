// BUSINESS_RULES.md "Billing": Free plan is limited to this many active
// (non-archived) applications; Pro is unlimited. Single source of truth -
// BillingService is the only place this constant is read.
export const FREE_PLAN_APPLICATION_LIMIT = 25;
