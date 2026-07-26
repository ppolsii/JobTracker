import { beforeEach, describe, expect, it, vi } from "vitest";

import { FREE_PLAN_APPLICATION_LIMIT } from "@/features/billing/constants/billing.constants";
import { BillingRepository } from "@/features/billing/repositories/billing.repository";
import { BillingService } from "@/features/billing/services/billing.service";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { UserService } from "@/features/users/services/user.service";
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

vi.mock("@/features/users/services/user.service", () => ({
  UserService: {
    getProfile: vi.fn(),
  },
}));

const mockedBilling = vi.mocked(BillingRepository);
const mockedApplications = vi.mocked(ApplicationRepository);
const mockedUsers = vi.mocked(UserService);

// Every test below is about a non-developer account unless it says
// otherwise - set once here so the many existing tests that predate the
// Developer Dogfooding fallback don't each need to configure it themselves.
beforeEach(() => {
  mockedUsers.getProfile.mockResolvedValue({
    success: true,
    data: { email: "someone-else@example.com" } as never,
  });
});

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

  it("allows a Pro plan user, without consulting the developer-account fallback", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "pro" }),
      error: null,
    } as never);

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(true);
    // A real Pro user's request never pays for the extra lookup - see
    // billing.service.ts's own comment on why this check is ordered after
    // the real subscription check, not before it.
    expect(mockedUsers.getProfile).not.toHaveBeenCalled();
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

describe("BillingService.getApplicationUsage", () => {
  it("returns the active count and the Free plan limit for a Free plan user", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: 8,
      error: null,
    } as never);

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result).toEqual({
      success: true,
      data: { used: 8, limit: FREE_PLAN_APPLICATION_LIMIT },
    });
  });

  it("returns a null limit for a Pro plan user, but still reports actual usage", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "pro" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: 42,
      error: null,
    } as never);

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result).toEqual({
      success: true,
      data: { used: 42, limit: null },
    });
  });

  it("defaults used to zero when the count query returns no count", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedApplications.countByStatuses.mockResolvedValue({
      count: null,
      error: null,
    } as never);

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result).toEqual({
      success: true,
      data: { used: 0, limit: FREE_PLAN_APPLICATION_LIMIT },
    });
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

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("propagates a subscription lookup failure", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    } as never);

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
    expect(mockedApplications.countByStatuses).not.toHaveBeenCalled();
  });
});

// Developer Dogfooding (see developer-account.ts): "Only this account
// should receive the Pro plan automatically. All other users must continue
// using the normal billing flow."
describe("BillingService - Developer Dogfooding", () => {
  it("grants Pro access to the developer account even though its real subscription is Free", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedUsers.getProfile.mockResolvedValue({
      success: true,
      data: { email: "polgoca@gmail.com" } as never,
    });

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(true);
  });

  it("grants Pro access to the developer account even with no subscription row at all", async () => {
    mockedBilling.getByUserId.mockResolvedValue({ data: null, error: null } as never);
    mockedUsers.getProfile.mockResolvedValue({
      success: true,
      data: { email: "polgoca@gmail.com" } as never,
    });

    const result = await BillingService.requireApplicationCapacity("user-1");

    expect(result.success).toBe(true);
    expect(mockedApplications.countByStatuses).not.toHaveBeenCalled();
  });

  it("does not grant Pro access to any other Free plan account", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedUsers.getProfile.mockResolvedValue({
      success: true,
      data: { email: "not-the-developer@example.com" } as never,
    });

    const result = await BillingService.requireProPlan("user-1");

    expect(result.success).toBe(false);
  });

  it("reports unlimited usage for the developer account, same as a real Pro user", async () => {
    mockedBilling.getByUserId.mockResolvedValue({
      data: subscriptionRow({ plan: "free" }),
      error: null,
    } as never);
    mockedUsers.getProfile.mockResolvedValue({
      success: true,
      data: { email: "polgoca@gmail.com" } as never,
    });
    mockedApplications.countByStatuses.mockResolvedValue({
      count: 42,
      error: null,
    } as never);

    const result = await BillingService.getApplicationUsage("user-1");

    expect(result).toEqual({ success: true, data: { used: 42, limit: null } });
  });

  describe("getSubscriptionForUser", () => {
    it("shows the developer account as an active Pro subscriber for display, without touching the stored row", async () => {
      mockedBilling.getByUserId.mockResolvedValue({
        data: subscriptionRow({
          plan: "free",
          status: null,
          stripe_customer_id: null,
        }),
        error: null,
      } as never);
      mockedUsers.getProfile.mockResolvedValue({
        success: true,
        data: { email: "polgoca@gmail.com" } as never,
      });

      const result = await BillingService.getSubscriptionForUser("user-1");

      expect(result).toEqual({
        success: true,
        data: subscriptionRow({
          plan: "pro",
          status: "active",
          stripe_customer_id: null,
        }),
      });
    });

    it("does not override an already-real subscription, and never consults the developer-account fallback for one", async () => {
      mockedBilling.getByUserId.mockResolvedValue({
        data: subscriptionRow({ plan: "pro", status: "active" }),
        error: null,
      } as never);

      const result = await BillingService.getSubscriptionForUser("user-1");

      expect(result).toEqual({
        success: true,
        data: subscriptionRow({ plan: "pro", status: "active" }),
      });
      expect(mockedUsers.getProfile).not.toHaveBeenCalled();
    });

    it("leaves a non-developer Free account exactly as stored", async () => {
      mockedBilling.getByUserId.mockResolvedValue({
        data: subscriptionRow({ plan: "free" }),
        error: null,
      } as never);
      mockedUsers.getProfile.mockResolvedValue({
        success: true,
        data: { email: "not-the-developer@example.com" } as never,
      });

      const result = await BillingService.getSubscriptionForUser("user-1");

      expect(result).toEqual({
        success: true,
        data: subscriptionRow({ plan: "free" }),
      });
    });

    it("leaves a user with no subscription row at all as null", async () => {
      mockedBilling.getByUserId.mockResolvedValue({ data: null, error: null } as never);
      mockedUsers.getProfile.mockResolvedValue({
        success: true,
        data: { email: "polgoca@gmail.com" } as never,
      });

      const result = await BillingService.getSubscriptionForUser("user-1");

      expect(result).toEqual({ success: true, data: null });
    });
  });
});
