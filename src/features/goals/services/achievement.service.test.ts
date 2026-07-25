import { describe, expect, it, vi } from "vitest";

import { AchievementRepository } from "@/features/goals/repositories/achievement.repository";
import { AchievementService } from "@/features/goals/services/achievement.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";

vi.mock("@/features/goals/repositories/achievement.repository", () => ({
  AchievementRepository: {
    listUnlockedForUser: vi.fn(),
    unlock: vi.fn(),
  },
}));

const mockedRepository = vi.mocked(AchievementRepository);

const EMPTY_CONTEXT = { apps: [], historyFacts: new Map(), streaks: {
  currentDayStreak: 0,
  longestDayStreak: 0,
  currentWeekStreak: 0,
  longestWeekStreak: 0,
  currentMonthStreak: 0,
  longestMonthStreak: 0,
} };

describe("AchievementService.evaluateAndUnlock", () => {
  it("returns an Internal Error when the unlocked-list read fails", async () => {
    mockedRepository.listUnlockedForUser.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);

    const result = await AchievementService.evaluateAndUnlock("user-1", EMPTY_CONTEXT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
    expect(mockedRepository.unlock).not.toHaveBeenCalled();
  });

  it("does not attempt to unlock anything already unlocked", async () => {
    mockedRepository.listUnlockedForUser.mockResolvedValue({
      data: [{ id: "1", user_id: "user-1", achievement_key: "first_application", unlocked_at: "2026-01-01T00:00:00.000Z" }],
      error: null,
    } as never);

    const apps = [
      { id: "a1", company_id: "c1", cv_version_id: "cv1", position: "Backend Engineer", source: null, work_mode: null, employment_type: null, application_date: "2026-01-01", current_status: "Applied", companies: { name: "Acme" }, cv_versions: { name: "CV" }, salary_min: null, salary_max: null, currency: null },
    ] as never;

    const result = await AchievementService.evaluateAndUnlock("user-1", {
      apps,
      historyFacts: new Map(),
      streaks: EMPTY_CONTEXT.streaks,
    });

    expect(result.success).toBe(true);
    expect(mockedRepository.unlock).not.toHaveBeenCalled();
    if (result.success) {
      expect(result.data).toEqual([
        { key: "first_application", unlockedAt: "2026-01-01T00:00:00.000Z" },
      ]);
    }
  });

  it("unlocks newly-earned achievements and includes them in the returned set", async () => {
    mockedRepository.listUnlockedForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedRepository.unlock.mockResolvedValue({
      data: { id: "1", user_id: "user-1", achievement_key: "first_application", unlocked_at: "2026-01-02T00:00:00.000Z" },
      error: null,
    } as never);

    const apps = [
      { id: "a1", company_id: "c1", cv_version_id: "cv1", position: "Backend Engineer", source: null, work_mode: null, employment_type: null, application_date: "2026-01-01", current_status: "Applied", companies: { name: "Acme" }, cv_versions: { name: "CV" }, salary_min: null, salary_max: null, currency: null },
    ] as never;

    const result = await AchievementService.evaluateAndUnlock("user-1", {
      apps,
      historyFacts: new Map(),
      streaks: EMPTY_CONTEXT.streaks,
    });

    expect(result.success).toBe(true);
    expect(mockedRepository.unlock).toHaveBeenCalledWith("user-1", "first_application");
    if (result.success) {
      expect(result.data.map((entry) => entry.key)).toContain("first_application");
    }
  });

  it("treats a unique-violation race as already unlocked, still including it in the returned set", async () => {
    mockedRepository.listUnlockedForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedRepository.unlock.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.UNIQUE_VIOLATION, message: "duplicate" },
    } as never);

    const apps = [
      { id: "a1", company_id: "c1", cv_version_id: "cv1", position: "Backend Engineer", source: null, work_mode: null, employment_type: null, application_date: "2026-01-01", current_status: "Applied", companies: { name: "Acme" }, cv_versions: { name: "CV" }, salary_min: null, salary_max: null, currency: null },
    ] as never;

    const result = await AchievementService.evaluateAndUnlock("user-1", {
      apps,
      historyFacts: new Map(),
      streaks: EMPTY_CONTEXT.streaks,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((entry) => entry.key)).toContain("first_application");
    }
  });

  it("does not fail the whole evaluation when a non-conflict unlock write fails (best-effort)", async () => {
    mockedRepository.listUnlockedForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedRepository.unlock.mockResolvedValue({
      data: null,
      error: { code: "OTHER", message: "db down" },
    } as never);

    const apps = [
      { id: "a1", company_id: "c1", cv_version_id: "cv1", position: "Backend Engineer", source: null, work_mode: null, employment_type: null, application_date: "2026-01-01", current_status: "Applied", companies: { name: "Acme" }, cv_versions: { name: "CV" }, salary_min: null, salary_max: null, currency: null },
    ] as never;

    const result = await AchievementService.evaluateAndUnlock("user-1", {
      apps,
      historyFacts: new Map(),
      streaks: EMPTY_CONTEXT.streaks,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((entry) => entry.key)).not.toContain("first_application");
    }
  });
});

describe("AchievementService.buildAchievementStates", () => {
  it("includes every achievement in the catalog, marking only the given ones as unlocked", () => {
    const states = AchievementService.buildAchievementStates([
      { key: "first_application", unlockedAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const firstApplication = states.find((s) => s.definition.key === "first_application");
    const applications10 = states.find((s) => s.definition.key === "applications_10");

    expect(firstApplication?.unlocked).toBe(true);
    expect(firstApplication?.unlockedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(applications10?.unlocked).toBe(false);
    expect(applications10?.unlockedAt).toBeNull();
  });
});

describe("AchievementService.labelFor", () => {
  it("returns the catalog label for a known key", () => {
    expect(AchievementService.labelFor("first_application")).toBe("First Application");
  });

  it("falls back to the raw key for an unknown key", () => {
    expect(AchievementService.labelFor("not_a_real_key")).toBe("not_a_real_key");
  });
});
