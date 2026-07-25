import { describe, expect, it, vi } from "vitest";

import { AnalyticsRepository } from "@/features/analytics/repositories/analytics.repository";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

// AnalyticsService.getSummary (the base Analytics page) is exercised
// entirely through analytics-calculations.test.ts's pure-function tests, per
// this codebase's existing convention (the Service itself is orchestration
// only). getAdvancedSummary is tested directly here specifically because
// Phase 33 introduces new Service-level behaviour analytics-calculations.ts
// can't cover on its own: the Pro gate itself ("PRO ACCESS: reuse the
// existing billing architecture").
// analytics.service.ts also imports AnalyticsRepository at module scope
// (used by getSummary, not under test here) - it must stay mocked so
// importing AnalyticsService never loads the real Supabase client.
vi.mock("@/features/analytics/repositories/analytics.repository", () => ({
  AnalyticsRepository: {
    getDashboardMetrics: vi.fn(),
    getCompanyStatistics: vi.fn(),
    getCvStatistics: vi.fn(),
    getMonthlyStatistics: vi.fn(),
  },
}));

vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: {
    requireProPlan: vi.fn(),
  },
}));

vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: {
    listAllForAnalytics: vi.fn(),
  },
}));

vi.mock("@/features/applications/services/application-status.service", () => ({
  ApplicationStatusService: {
    listHistoryForApplications: vi.fn(),
  },
}));

const mockedBilling = vi.mocked(BillingService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedHistory = vi.mocked(ApplicationStatusService);
const mockedAnalyticsRepository = vi.mocked(AnalyticsRepository);

// Bug fix follow-up (UX Refinement phase): "no applications yet" must be
// representable as an explicit, expected state (`totalApplications: 0`),
// not inferred indirectly from a nested rate metric - see
// analytics/page.tsx's own empty state, which branches on this field.
describe("AnalyticsService.getSummary", () => {
  it("reports totalApplications: 0 for a user with no applications (an expected empty state, not an error)", async () => {
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [],
    });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: true,
      data: [],
    });
    mockedAnalyticsRepository.getDashboardMetrics.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedAnalyticsRepository.getCompanyStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);
    mockedAnalyticsRepository.getCvStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);
    mockedAnalyticsRepository.getMonthlyStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await AnalyticsService.getSummary("user-1");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.totalApplications).toBe(0);
  });

  it("reports totalApplications matching the number of applications fetched", async () => {
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          id: "a1",
          company_id: "c1",
          cv_version_id: "cv1",
          position: "Backend Engineer",
          source: null,
          work_mode: "Remote",
          employment_type: "Full Time",
          application_date: "2026-01-05",
          current_status: "Applied",
          companies: { name: "Acme" },
          cv_versions: { name: "Backend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
      ] as never,
    });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: true,
      data: [],
    });
    mockedAnalyticsRepository.getDashboardMetrics.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedAnalyticsRepository.getCompanyStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);
    mockedAnalyticsRepository.getCvStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);
    mockedAnalyticsRepository.getMonthlyStatistics.mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await AnalyticsService.getSummary("user-1");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.totalApplications).toBe(1);
  });
});

describe("AnalyticsService.getAdvancedSummary", () => {
  it("denies a Free plan user before ever fetching applications ('do not duplicate Pro gating logic')", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await AnalyticsService.getAdvancedSummary("user-1", {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedApplications.listAllForAnalytics).not.toHaveBeenCalled();
  });

  it("returns a full summary for a Pro plan user, applying filters before every section", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          id: "a1",
          company_id: "c1",
          cv_version_id: "cv1",
          position: "Backend Engineer",
          source: null,
          work_mode: "Remote",
          employment_type: "Full Time",
          application_date: "2026-01-05",
          current_status: "Applied",
          companies: { name: "Acme" },
          cv_versions: { name: "Backend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
        {
          id: "a2",
          company_id: "c2",
          cv_version_id: "cv2",
          position: "Frontend Engineer",
          source: null,
          work_mode: "Hybrid",
          employment_type: "Contract",
          application_date: "2026-02-05",
          current_status: "Applied",
          companies: { name: "Globex" },
          cv_versions: { name: "Frontend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
      ],
    });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: true,
      data: [],
    });

    const result = await AnalyticsService.getAdvancedSummary("user-1", {
      workMode: "Remote",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Only the Remote application should feed every section once filtered.
    expect(result.data.companyAnalytics.map((row) => row.id)).toEqual(["c1"]);
    expect(
      result.data.workModeAnalytics.every((row) => row.applications <= 1)
    ).toBe(true);
  });

  it("propagates an applications-fetch failure", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await AnalyticsService.getAdvancedSummary("user-1", {});

    expect(result.success).toBe(false);
  });

  it("propagates a history-fetch failure", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [],
    });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await AnalyticsService.getAdvancedSummary("user-1", {});

    expect(result.success).toBe(false);
  });
});
