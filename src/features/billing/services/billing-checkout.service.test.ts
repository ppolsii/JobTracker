import { describe, expect, it, vi } from "vitest";

import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import { BillingCheckoutService } from "@/features/billing/services/billing-checkout.service";
import { getStripeClient, getStripeProPriceId } from "@/lib/stripe";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/billing/repositories/billing.repository", () => ({
  BillingRepository: { getByUserId: vi.fn() },
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
  getStripeProPriceId: vi.fn(),
}));

// billing-checkout.service.ts reads env.appUrl directly - env.ts eagerly
// validates NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY at
// import time (neither is set in this test environment), so it must stay
// mocked here, the same way marketing/utils/seo.test.ts already does for
// the same reason.
vi.mock("@/config/env", () => ({
  env: { appUrl: "https://jobtrackerinsights.example.com" },
}));

const mockedBilling = vi.mocked(BillingRepository);
const mockedGetStripeClient = vi.mocked(getStripeClient);
const mockedGetPriceId = vi.mocked(getStripeProPriceId);

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    user_id: "user-1",
    plan: "free",
    status: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    billing_interval: null,
    cancel_at: null,
    latest_invoice_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("BillingCheckoutService.createCheckoutSession", () => {
  it("rejects a user who already has an active Pro subscription", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "pro" }),
      error: null,
    } as never);

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockedGetStripeClient).not.toHaveBeenCalled();
  });

  it("returns a friendly error when the subscription lookup fails", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("returns a friendly error when the price id is not configured", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow(),
      error: null,
    } as never);
    mockedGetPriceId.mockImplementation(() => {
      throw new Error("Missing required environment variable: STRIPE_PRO_MONTHLY_PRICE_ID");
    });

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("passes customer_email when no Stripe customer is linked yet", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ stripe_customer_id: null }),
      error: null,
    } as never);
    mockedGetPriceId.mockReturnValue("price_month_1");
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session_1" });
    mockedGetStripeClient.mockReturnValue({ checkout: { sessions: { create } } } as never);

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result).toEqual({
      success: true,
      data: { url: "https://checkout.stripe.com/session_1" },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        client_reference_id: "user-1",
        customer_email: "user@example.com",
        line_items: [{ price: "price_month_1", quantity: 1 }],
      })
    );
  });

  it("reuses an existing Stripe customer id instead of customer_email when already linked", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ stripe_customer_id: "cus_existing" }),
      error: null,
    } as never);
    mockedGetPriceId.mockReturnValue("price_year_1");
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session_2" });
    mockedGetStripeClient.mockReturnValue({ checkout: { sessions: { create } } } as never);

    await BillingCheckoutService.createCheckoutSession("user-1", "user@example.com", "year");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ customer_email: expect.anything() })
    );
  });

  it("returns a friendly error when Stripe returns no session url", async () => {
    mockedBilling.getByUserId.mockResolvedValue({ data: subscriptionRow(), error: null } as never);
    mockedGetPriceId.mockReturnValue("price_month_1");
    mockedGetStripeClient.mockReturnValue({
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: null }) } },
    } as never);

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result.success).toBe(false);
  });

  it("handles a Stripe API/network failure gracefully ('Network Errors')", async () => {
    mockedBilling.getByUserId.mockResolvedValue({ data: subscriptionRow(), error: null } as never);
    mockedGetPriceId.mockReturnValue("price_month_1");
    mockedGetStripeClient.mockReturnValue({
      checkout: {
        sessions: { create: vi.fn().mockRejectedValue(new Error("network down")) },
      },
    } as never);

    const result = await BillingCheckoutService.createCheckoutSession(
      "user-1",
      "user@example.com",
      "month"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});

describe("BillingCheckoutService.createBillingPortalSession", () => {
  it("returns a Not Found error when the user has no Stripe customer yet ('Missing Customer')", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ stripe_customer_id: null }),
      error: null,
    } as never);

    const result = await BillingCheckoutService.createBillingPortalSession("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
    expect(mockedGetStripeClient).not.toHaveBeenCalled();
  });

  it("creates a portal session for an existing Stripe customer", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ stripe_customer_id: "cus_1", plan: "pro" }),
      error: null,
    } as never);
    const create = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal_1" });
    mockedGetStripeClient.mockReturnValue({ billingPortal: { sessions: { create } } } as never);

    const result = await BillingCheckoutService.createBillingPortalSession("user-1");

    expect(result).toEqual({
      success: true,
      data: { url: "https://billing.stripe.com/portal_1" },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1" })
    );
  });

  it("handles a Stripe API/network failure gracefully", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ stripe_customer_id: "cus_1" }),
      error: null,
    } as never);
    mockedGetStripeClient.mockReturnValue({
      billingPortal: {
        sessions: { create: vi.fn().mockRejectedValue(new Error("network down")) },
      },
    } as never);

    const result = await BillingCheckoutService.createBillingPortalSession("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("returns a friendly error when the subscription lookup fails", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);

    const result = await BillingCheckoutService.createBillingPortalSession("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});
