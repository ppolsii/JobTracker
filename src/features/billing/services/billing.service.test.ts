import { describe, expect, it, vi } from "vitest";

import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import { BillingService } from "@/features/billing/services/billing.service";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/billing/repositories/billing.repository", () => ({
  BillingRepository: {
    getByUserId: vi.fn(),
  },
}));

vi.mock("@/features/applications/repositories/application.repository", () => ({
  ApplicationRepository: {
    countByStatuses: vi.fn(),
  },
}));

const mockedBilling = vi.mocked(BillingRepository);
const mockedApplications = vi.mocked(ApplicationRepository);

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    user_id: "user-1",
    plan: "free",
    status: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("BillingService.requireProPlan", () => {
  it("denies a Free plan user", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
  });

  it("allows a Pro plan user", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "pro" }),
      error: null,
    } as never);

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(true);
  });

  it("denies a user with no subscription row at all", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(false);
  });

  it("returns an internal error when the subscription lookup fails", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    } as never);

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});

describe("BillingService.requireApplicationCapacity", () => {
  it("always allows a Pro plan user, without checking the application count", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "pro" }),
      error: null,
    } as never);

    const result = await BillingService.requireApplicationCapacity("user-1");

    expect(result.success).toBe(true);
    expect(mockedApplications.countByStatuses).not.toHaveBeenCalled();
  });

  it("allows a Free plan user below the limit", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: FREE_PLAN_APPLICATION_LIMIT - 1,
      error: null,
    } as never);

    const result = await BillingService.requireApplicationCapacity("user-1");

    expect(result.success).toBe(true);
  });

  it("denies a Free plan user who has reached the limit", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: FREE_PLAN_APPLICATION_LIMIT,
      error: null,
    } as never);

    const result = await BillingService.requireApplicationCapacity("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(result.error.message).toContain(String(FREE_PLAN_APPLICATION_LIMIT));
    }
  });

  it("returns an internal error when the application count query fails", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: null,
      error: { message: "db error" },
    } as never);

    const result = await BillingService.requireApplicationCapacity("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});
