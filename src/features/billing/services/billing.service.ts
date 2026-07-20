import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import type { Subscription } from "@/features/billing/types/billing.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER_V2.md Phase 23: infrastructure only. This Service
// exposes the subscription record; it does not decide what any of its
// fields mean for feature access. A requirePlan-style guard belongs here
// once Phase 24 (Plan Gating Enforcement) has a real gating rule to
// enforce (BUSINESS_RULES.md) - nothing calls getSubscriptionForUser yet.
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
};
