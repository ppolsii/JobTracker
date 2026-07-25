import { describe, expect, it, vi } from "vitest";

import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { GoalRepository } from "@/features/goals/repositories/goal.repository";
import { AchievementService } from "@/features/goals/services/achievement.service";
import { GoalService } from "@/features/goals/services/goal.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: { requireProPlan: vi.fn() },
}));

vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: { listAllForAnalytics: vi.fn() },
}));

vi.mock("@/features/applications/services/application-status.service", () => ({
  ApplicationStatusService: { listHistoryForApplications: vi.fn() },
}));

vi.mock("@/features/goals/repositories/goal.repository", () => ({
  GoalRepository: {
    create: vi.fn(),
    listAllForUser: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock("@/features/goals/services/achievement.service", () => ({
  AchievementService: {
    evaluateAndUnlock: vi.fn(),
    buildAchievementStates: vi.fn(() => []),
    labelFor: vi.fn((key: string) => key),
  },
}));

const mockedBilling = vi.mocked(BillingService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedHistory = vi.mocked(ApplicationStatusService);
const mockedGoalRepository = vi.mocked(GoalRepository);
const mockedAchievements = vi.mocked(AchievementService);

function allowPro() {
  mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
}

function emptyBulkData() {
  mockedApplications.listAllForAnalytics.mockResolvedValue({ success: true, data: [] });
  mockedGoalRepository.listAllForUser.mockResolvedValue({ data: [], error: null } as never);
  mockedHistory.listHistoryForApplications.mockResolvedValue({ success: true, data: [] });
  mockedAchievements.evaluateAndUnlock.mockResolvedValue({ success: true, data: [] });
}

const TODAY = new Date(Date.UTC(2026, 0, 15));

describe("GoalService.getGoalsPageData", () => {
  it("denies a Free plan user before fetching anything", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await GoalService.getGoalsPageData("user-1", TODAY);

    expect(result.success).toBe(false);
    expect(mockedApplications.listAllForAnalytics).not.toHaveBeenCalled();
  });

  it("returns goals with progress, streaks, statistics, and achievement states for a Pro user", async () => {
    allowPro();
    emptyBulkData();
    mockedGoalRepository.listAllForUser.mockResolvedValue({
      data: [
        {
          id: "g1",
          user_id: "user-1",
          metric: "applications",
          period: "weekly",
          target_value: 5,
          title: null,
          status: "active",
          completed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deleted_at: null,
        },
      ],
      error: null,
    } as never);

    const result = await GoalService.getGoalsPageData("user-1", TODAY);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goalsWithProgress).toHaveLength(1);
      expect(result.data.statistics.activeGoals).toBe(1);
      expect(result.data.achievements).toEqual([]);
    }
  });

  it("propagates an Internal Error when the goals read fails", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({ success: true, data: [] });
    mockedGoalRepository.listAllForUser.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);

    const result = await GoalService.getGoalsPageData("user-1", TODAY);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
    expect(mockedHistory.listHistoryForApplications).not.toHaveBeenCalled();
  });

  it("persists completed_at once for a 'total' goal whose progress newly reaches target", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          id: "a1",
          company_id: "c1",
          cv_version_id: "cv1",
          position: "Backend Engineer",
          source: null,
          work_mode: null,
          employment_type: null,
          application_date: "2026-01-01",
          current_status: "Applied",
          companies: { name: "Acme" },
          cv_versions: { name: "CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
      ],
    });
    mockedHistory.listHistoryForApplications.mockResolvedValue({ success: true, data: [] });
    mockedAchievements.evaluateAndUnlock.mockResolvedValue({ success: true, data: [] });
    mockedGoalRepository.listAllForUser.mockResolvedValue({
      data: [
        {
          id: "g1",
          user_id: "user-1",
          metric: "applications",
          period: "total",
          target_value: 1,
          title: null,
          status: "active",
          completed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deleted_at: null,
        },
      ],
      error: null,
    } as never);
    mockedGoalRepository.update.mockResolvedValue({
      data: { id: "g1", completed_at: TODAY.toISOString() },
      error: null,
    } as never);

    const result = await GoalService.getGoalsPageData("user-1", TODAY);

    expect(result.success).toBe(true);
    expect(mockedGoalRepository.update).toHaveBeenCalledWith(
      "user-1",
      "g1",
      expect.objectContaining({ completed_at: TODAY.toISOString() })
    );
    if (result.success) {
      expect(result.data.goalsWithProgress[0].progress.isCompleted).toBe(true);
    }
  });

  it("does not re-persist completed_at for a 'total' goal that is already marked completed", async () => {
    allowPro();
    emptyBulkData();
    mockedGoalRepository.listAllForUser.mockResolvedValue({
      data: [
        {
          id: "g1",
          user_id: "user-1",
          metric: "applications",
          period: "total",
          target_value: 1,
          title: null,
          status: "active",
          completed_at: "2025-12-01T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deleted_at: null,
        },
      ],
      error: null,
    } as never);

    await GoalService.getGoalsPageData("user-1", TODAY);

    expect(mockedGoalRepository.update).not.toHaveBeenCalled();
  });
});

describe("GoalService.getDashboardWidgetData", () => {
  it("denies a Free plan user before fetching anything", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await GoalService.getDashboardWidgetData("user-1", TODAY);

    expect(result.success).toBe(false);
    expect(mockedApplications.listAllForAnalytics).not.toHaveBeenCalled();
  });

  it("reuses the same bulk applications read for progress and today's count (no second query)", async () => {
    allowPro();
    emptyBulkData();

    const result = await GoalService.getDashboardWidgetData("user-1", TODAY);

    expect(result.success).toBe(true);
    // Only one bulk applications read across the whole call.
    expect(mockedApplications.listAllForAnalytics).toHaveBeenCalledTimes(1);
  });
});

describe("GoalService.listGoalsWithProgressForCalendar", () => {
  it("does not re-check the Pro plan (the calling CalendarService already gated the whole read)", async () => {
    emptyBulkData();

    const result = await GoalService.listGoalsWithProgressForCalendar("user-1", TODAY);

    expect(result.success).toBe(true);
    expect(mockedBilling.requireProPlan).not.toHaveBeenCalled();
  });
});

describe("GoalService.createGoal", () => {
  it("denies a Free plan user before creating anything", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await GoalService.createGoal("user-1", {
      metric: "applications",
      period: "weekly",
      targetValue: 5,
    });

    expect(result.success).toBe(false);
    expect(mockedGoalRepository.create).not.toHaveBeenCalled();
  });

  it("trims the title and defaults it to null when blank", async () => {
    allowPro();
    mockedGoalRepository.create.mockResolvedValue({ data: { id: "g1" }, error: null } as never);

    await GoalService.createGoal("user-1", {
      metric: "applications",
      period: "weekly",
      targetValue: 5,
      title: "   ",
    });

    expect(mockedGoalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: null })
    );
  });
});

describe("GoalService.setGoalStatus", () => {
  it("returns Not Found when the repository finds no matching row", async () => {
    allowPro();
    mockedGoalRepository.update.mockResolvedValue({ data: null, error: null } as never);

    const result = await GoalService.setGoalStatus("user-1", "g1", "paused");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("updates only the status field", async () => {
    allowPro();
    mockedGoalRepository.update.mockResolvedValue({ data: { id: "g1", status: "archived" }, error: null } as never);

    await GoalService.setGoalStatus("user-1", "g1", "archived");

    expect(mockedGoalRepository.update).toHaveBeenCalledWith("user-1", "g1", { status: "archived" });
  });
});

describe("GoalService.deleteGoal", () => {
  it("returns Not Found when the repository finds no matching row", async () => {
    allowPro();
    mockedGoalRepository.softDelete.mockResolvedValue({ data: null, error: null } as never);

    const result = await GoalService.deleteGoal("user-1", "g1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the deleted row on success", async () => {
    allowPro();
    mockedGoalRepository.softDelete.mockResolvedValue({
      data: { id: "g1", deleted_at: "2026-01-15T00:00:00.000Z" },
      error: null,
    } as never);

    const result = await GoalService.deleteGoal("user-1", "g1");

    expect(result).toEqual({
      success: true,
      data: { id: "g1", deleted_at: "2026-01-15T00:00:00.000Z" },
    });
  });
});
