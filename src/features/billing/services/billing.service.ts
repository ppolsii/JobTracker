import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { isDeveloperAccount } from "@/features/billing/constants/developer-account";
import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import type { Subscription } from "@/features/billing/types/billing.types";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { UserService } from "@/features/users/services/user.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// Developer Dogfooding (see developer-account.ts for the full reasoning):
// resolves whether `userId` is the developer account, via `UserService` -
// the same cross-feature "Service calls Service, never a Repository
// directly" pattern every other Service in this codebase already uses
// (e.g. AnalyticsService -> ApplicationService). Only ever consulted as a
// fallback after the real subscription has already been checked and found
// not-Pro (see both call sites below), so a real paying Pro user's request
// never pays for this extra lookup.
async function isDeveloperUser(userId: string): Promise<boolean> {
  const profile = await UserService.getProfile(userId);
  return profile.success && isDeveloperAccount(profile.data.email);
}

// IMPLEMENTATION_ORDER_V2.md Phase 24: this Service is the single, central
// place entitlement decisions are made (BUSINESS_RULES.md "Billing").
// Callers (ApplicationService, ExportService) never inspect `plan` or
// count anything themselves - they call one of the require* methods below
// and get back a plain allow/deny ActionResult, the same shape
// AuthService.requireUserId already established for authentication.
async function getIsProPlan(userId: string): Promise<ActionResult<boolean>> {
  const { data, error } = await BillingRepository.getByUserId(userId);

  if (error) {
    return {
      success: false,
      error: {
        message: "Something went wrong while checking your plan.",
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    };
  }

  if (data?.plan === "pro") {
    return { success: true, data: true };
  }

  // Developer Dogfooding (see developer-account.ts) - a real Pro user never
  // reaches this line (already returned above).
  if (await isDeveloperUser(userId)) {
    return { success: true, data: true };
  }

  return { success: true, data: false };
}

export const BillingService = {
  async getSubscriptionForUser(
    userId: string
  ): Promise<ActionResult<Subscription | null>> {
    const { data, error } = await BillingRepository.getByUserId(userId);

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading subscription data.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    const subscription = data ?? null;

    // Developer Dogfooding (see developer-account.ts): the Pricing/Settings
    // UI should show this account as a real, active Pro subscriber, exactly
    // like every other Pro-entitlement decision this Service makes. Every
    // other field on the real row is left untouched - there is no real
    // Stripe customer behind this override, so "Manage subscription" will
    // not work for it; this exception is only about unlocking Pro
    // *features*, never about faking Stripe's own billing-portal UI.
    if (subscription && subscription.plan !== "pro") {
      if (await isDeveloperUser(userId)) {
        return {
          success: true,
          data: { ...subscription, plan: "pro", status: "active" },
        };
      }
    }

    return { success: true, data: subscription };
  },

  // BUSINESS_RULES.md "Billing": Export requires Pro.
  async requireProPlan(userId: string): Promise<ActionResult<true>> {
    const isPro = await getIsProPlan(userId);
    if (!isPro.success) return isPro;

    if (!isPro.data) {
      return {
        success: false,
        error: {
          message: "This feature requires a Pro plan.",
          code: ERROR_CODES.FORBIDDEN,
        },
      };
    }

    return { success: true, data: true };
  },

  // BUSINESS_RULES.md "Billing": Free plan is limited to
  // FREE_PLAN_APPLICATION_LIMIT active (non-archived) applications; Pro is
  // unlimited. countByStatuses (no status filter) is the same generic,
  // business-rule-free counting primitive ApplicationStatsService already
  // reuses from a different feature's Service for its own purposes.
  async requireApplicationCapacity(userId: string): Promise<ActionResult<true>> {
    const isPro = await getIsProPlan(userId);
    if (!isPro.success) return isPro;
    if (isPro.data) return { success: true, data: true };

    const { count, error } = await ApplicationRepository.countByStatuses(userId);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while checking your application limit.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if ((count ?? 0) >= FREE_PLAN_APPLICATION_LIMIT) {
      return {
        success: false,
        error: {
          message: `The Free plan is limited to ${FREE_PLAN_APPLICATION_LIMIT} applications. Upgrade to Pro for unlimited applications.`,
          code: ERROR_CODES.FORBIDDEN,
        },
      };
    }

    return { success: true, data: true };
  },

  // Phase 31.5 (Pro Plan Foundation) - read-only sibling of
  // requireApplicationCapacity, for display (the Usage Indicator) rather
  // than an allow/deny decision. Reuses the exact same count primitive and
  // constant - the number shown to the user and the number enforced on
  // create are guaranteed to be the same value, never two separate
  // calculations. `limit: null` means unlimited (Pro).
  async getApplicationUsage(
    userId: string
  ): Promise<ActionResult<{ used: number; limit: number | null }>> {
    const isPro = await getIsProPlan(userId);
    if (!isPro.success) return isPro;

    const { count, error } = await ApplicationRepository.countByStatuses(userId);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while checking your application usage.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return {
      success: true,
      data: {
        used: count ?? 0,
        limit: isPro.data ? null : FREE_PLAN_APPLICATION_LIMIT,
      },
    };
  },
};
