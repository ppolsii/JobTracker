import { env } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import type { BillingInterval } from "@/features/billing/types/billing.types";
import { getStripeClient, getStripeProPriceId } from "@/lib/stripe";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

function stripeErrorMessage(context: string, error: unknown): string {
  return `${context}: ${error instanceof Error ? error.message : "unknown error"}`;
}

// IMPLEMENTATION_ORDER_V2.md Phase 38 (Production Billing). Owns the two
// Stripe-hosted redirect flows - "CHECKOUT" and "CUSTOMER PORTAL" - as one
// small, focused Service alongside the existing BillingService
// (entitlements) and BillingWebhookService (event processing). Neither
// method here ever writes to `subscriptions` directly - that stays the
// webhook's job alone (BUSINESS_RULES.md "Billing": "A user may never set
// their own plan or subscription status directly"); this Service only
// starts a Stripe-hosted session and returns its URL for the caller
// (a Server Action) to redirect to.
export const BillingCheckoutService = {
  // "CHECKOUT": "Support: Monthly subscription, Yearly subscription."
  // Reuses an existing stripe_customer_id when one is already linked
  // (e.g. a previously-canceled subscription) rather than letting Stripe
  // create a second customer for the same user.
  async createCheckoutSession(
    userId: string,
    email: string,
    interval: BillingInterval
  ): Promise<ActionResult<{ url: string }>> {
    const { data: subscription, error } = await BillingRepository.getByUserId(userId);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while checking your plan.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    if (subscription?.plan === "pro") {
      return {
        success: false,
        error: {
          message: "You already have an active Pro subscription.",
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      };
    }

    let priceId: string;
    try {
      priceId = getStripeProPriceId(interval);
    } catch (priceError) {
      console.error(stripeErrorMessage("Stripe checkout misconfigured", priceError));
      return {
        success: false,
        error: {
          message: "Upgrading isn't available right now. Please try again later.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    try {
      const session = await getStripeClient().checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        // Resolved back to this user in BillingWebhookService's
        // checkout.session.completed handler - the only place a
        // stripe_customer_id is first linked.
        client_reference_id: userId,
        ...(subscription?.stripe_customer_id
          ? { customer: subscription.stripe_customer_id }
          : { customer_email: email }),
        success_url: `${env.appUrl}${ROUTES.SETTINGS}?checkout=success`,
        cancel_url: `${env.appUrl}${ROUTES.SETTINGS}?checkout=cancelled`,
      });

      if (!session.url) {
        return {
          success: false,
          error: {
            message: "Something went wrong starting checkout. Please try again.",
            code: ERROR_CODES.INTERNAL_ERROR,
          },
        };
      }

      return { success: true, data: { url: session.url } };
    } catch (checkoutError) {
      // "Network Errors": a Stripe API/network failure must never crash the
      // Server Action - translated into the same friendly, generic message
      // every other unexpected failure in this codebase already uses.
      console.error(stripeErrorMessage("Stripe checkout session creation failed", checkoutError));
      return {
        success: false,
        error: {
          message: "Something went wrong starting checkout. Please try again.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
  },

  // "CUSTOMER PORTAL": "The existing 'Manage Subscription' button should
  // redirect to the real portal." Update payment method/download invoices/
  // cancel/resume/change billing information are all portal features Stripe
  // itself provides once enabled in the Stripe Dashboard's own Customer
  // Portal configuration - this Service only opens the door to it, it does
  // not reimplement any of those capabilities (that would duplicate Stripe's
  // own hosted UI, not reuse it).
  async createBillingPortalSession(userId: string): Promise<ActionResult<{ url: string }>> {
    const { data: subscription, error } = await BillingRepository.getByUserId(userId);
    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while loading your subscription.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    // "Missing Customer": a user who has never completed Checkout has no
    // Stripe customer to manage yet.
    if (!subscription?.stripe_customer_id) {
      return {
        success: false,
        error: {
          message: "No billing account found yet - upgrade to Pro first.",
          code: ERROR_CODES.NOT_FOUND,
        },
      };
    }

    try {
      const session = await getStripeClient().billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${env.appUrl}${ROUTES.SETTINGS}`,
      });

      return { success: true, data: { url: session.url } };
    } catch (portalError) {
      console.error(stripeErrorMessage("Stripe billing portal session creation failed", portalError));
      return {
        success: false,
        error: {
          message: "Something went wrong opening billing management. Please try again.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }
  },
};
