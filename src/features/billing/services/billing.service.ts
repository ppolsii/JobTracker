import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import type { Subscription } from "@/features/billing/types/billing.types";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

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

  return { success: true, data: data?.plan === "pro" };
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

    return { success: true, data: data ?? null };
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
};
