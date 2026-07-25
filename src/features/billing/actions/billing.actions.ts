"use server";

import { redirect } from "next/navigation";

import { AuthService } from "@/features/auth/services/auth.service";
import { BillingCheckoutService } from "@/features/billing/services/billing-checkout.service";
import type { BillingInterval } from "@/features/billing/types/billing.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// "Use server-side actions only." Both actions below either redirect to a
// Stripe-hosted URL (the only success outcome - `redirect()` throws, so
// there is no "success" ActionResult to construct) or return a friendly
// error the calling client component shows as a toast.
export async function createCheckoutSessionAction(
  interval: BillingInterval
): Promise<ActionResult<never>> {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: { message: "You must be logged in.", code: ERROR_CODES.UNAUTHENTICATED },
    };
  }

  const result = await BillingCheckoutService.createCheckoutSession(
    user.id,
    user.email ?? "",
    interval
  );
  if (!result.success) return result;

  redirect(result.data.url);
}

export async function createBillingPortalSessionAction(): Promise<ActionResult<never>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  const result = await BillingCheckoutService.createBillingPortalSession(auth.data);
  if (!result.success) return result;

  redirect(result.data.url);
}
