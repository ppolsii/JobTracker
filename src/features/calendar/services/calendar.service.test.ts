import { describe, expect, it, vi } from "vitest";

import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { CalendarEventRepository } from "@/features/calendar/repositories/calendar-event.repository";
import { CalendarService } from "@/features/calendar/services/calendar.service";
import { GoalService } from "@/features/goals/services/goal.service";
import { InterviewFeedbackService } from "@/features/interview-feedback/services/interview-feedback.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

// CalendarService is pure orchestration (calendar-calculations.test.ts
// covers the actual event derivation/filter/search logic) - these tests
// exercise what only the Service adds: Pro-gating ("do not create a new Pro
// gating system" - reuses BillingService.requireProPlan, the same primitive
// Export/Smart Job Import/Advanced Analytics already use), bulk-fetch
// orchestration, and custom-event CRUD ownership checks.
vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: { requireProPlan: vi.fn() },
}));

vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: { listAllForAnalytics: vi.fn(), getById: vi.fn() },
}));

vi.mock("@/features/applications/services/application-status.service", () => ({
  ApplicationStatusService: { listHistoryForApplications: vi.fn() },
}));

vi.mock("@/features/applications/services/application-note.service", () => ({
  ApplicationNoteService: { listAllForUser: vi.fn() },
}));

vi.mock("@/features/interview-feedback/services/interview-feedback.service", () => ({
  InterviewFeedbackService: { listAllForUser: vi.fn() },
}));

vi.mock("@/features/goals/services/goal.service", () => ({
  GoalService: { listGoalsWithProgressForCalendar: vi.fn() },
}));

vi.mock("@/features/calendar/repositories/calendar-event.repository", () => ({
  CalendarEventRepository: {
    create: vi.fn(),
    listAllForUser: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
}));

const mockedBilling = vi.mocked(BillingService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedHistory = vi.mocked(ApplicationStatusService);
const mockedNotes = vi.mocked(ApplicationNoteService);
const mockedFeedback = vi.mocked(InterviewFeedbackService);
const mockedRepository = vi.mocked(CalendarEventRepository);
const mockedGoals = vi.mocked(GoalService);

function allowPro() {
  mockedBilling.requireProPlan.mockResolvedValue({ success: true, data: true });
  mockedGoals.listGoalsWithProgressForCalendar.mockResolvedValue({
    success: true,
    data: [],
  });
}

describe("CalendarService.getEvents", () => {
  it("denies a Free plan user before fetching anything ('do not create a new Pro gating system')", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await CalendarService.getEvents("user-1", {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedApplications.listAllForAnalytics).not.toHaveBeenCalled();
  });

  it("bulk-fetches applications, custom events, notes and feedback in parallel, then derives/filters/searches events", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          id: "app-1",
          company_id: "c1",
          cv_version_id: "cv1",
          position: "Backend Engineer",
          source: null,
          work_mode: null,
          employment_type: null,
          application_date: "2026-01-01",
          current_status: "Applied",
          companies: { name: "Acme" },
          cv_versions: { name: "Backend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
      ],
    });
    mockedRepository.listAllForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedNotes.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedFeedback.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: true,
      data: [
        {
          id: "h1",
          application_id: "app-1",
          previous_status: null,
          new_status: "Applied",
          changed_at: "2026-01-05T00:00:00.000Z",
          created_by: "user-1",
        },
      ],
    });

    const result = await CalendarService.getEvents("user-1", {});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0].type).toBe("application_submitted");
      expect(result.data.history).toHaveLength(1);
    }
    expect(mockedHistory.listHistoryForApplications).toHaveBeenCalledWith([
      "app-1",
    ]);
  });

  // "CALENDAR INTEGRATION" (Phase 35): goal deadlines merge into the same
  // event list every other event type already goes through - filters,
  // search, and sorting apply to them identically, not through a parallel
  // path.
  it("merges goal deadline events (from GoalService) into the returned events, sorted with everything else", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({ success: true, data: [] });
    mockedRepository.listAllForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedNotes.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedFeedback.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedHistory.listHistoryForApplications.mockResolvedValue({ success: true, data: [] });
    mockedGoals.listGoalsWithProgressForCalendar.mockResolvedValue({
      success: true,
      data: [
        {
          goal: {
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
          progress: {
            current: 2,
            target: 5,
            remaining: 3,
            percentage: 40,
            estimatedCompletionDate: null,
            periodStart: "2026-01-05",
            periodEnd: "2026-01-11",
            isCompleted: false,
          },
        },
      ],
    });

    const result = await CalendarService.getEvents("user-1", {});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0].type).toBe("goal_deadline");
      expect(result.data.events[0].date).toBe("2026-01-11");
      expect(result.data.events[0].goalCompleted).toBe(false);
    }
  });

  it("propagates an error when the goals read fails", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({ success: true, data: [] });
    mockedRepository.listAllForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedNotes.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedFeedback.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedGoals.listGoalsWithProgressForCalendar.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong while loading your goals.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await CalendarService.getEvents("user-1", {});

    expect(result.success).toBe(false);
    expect(mockedHistory.listHistoryForApplications).not.toHaveBeenCalled();
  });

  it("applies filters before search, narrowing results progressively", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          id: "app-1",
          company_id: "c1",
          cv_version_id: "cv1",
          position: "Backend Engineer",
          source: null,
          work_mode: null,
          employment_type: null,
          application_date: "2026-01-01",
          current_status: "Applied",
          companies: { name: "Acme" },
          cv_versions: { name: "Backend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
        {
          id: "app-2",
          company_id: "c2",
          cv_version_id: "cv2",
          position: "Data Analyst",
          source: null,
          work_mode: null,
          employment_type: null,
          application_date: "2026-01-01",
          current_status: "Applied",
          companies: { name: "Globex" },
          cv_versions: { name: "Backend CV" },
          salary_min: null,
          salary_max: null,
          currency: null,
        },
      ],
    });
    mockedRepository.listAllForUser.mockResolvedValue({ data: [], error: null } as never);
    mockedNotes.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedFeedback.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedHistory.listHistoryForApplications.mockResolvedValue({
      success: true,
      data: [
        {
          id: "h1",
          application_id: "app-1",
          previous_status: null,
          new_status: "Applied",
          changed_at: "2026-01-05T00:00:00.000Z",
          created_by: "user-1",
        },
        {
          id: "h2",
          application_id: "app-2",
          previous_status: null,
          new_status: "Applied",
          changed_at: "2026-01-06T00:00:00.000Z",
          created_by: "user-1",
        },
      ],
    });

    const result = await CalendarService.getEvents(
      "user-1",
      { companyId: "c1" },
      "Analyst"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Filtered to company c1 (app-1) first, so a search for "Analyst"
      // (which only matches app-2) finds nothing - filters and search
      // combine, they don't independently widen the result.
      expect(result.data.events).toEqual([]);
    }
  });

  it("propagates an Internal Error when the custom-events read fails", async () => {
    allowPro();
    mockedApplications.listAllForAnalytics.mockResolvedValue({ success: true, data: [] });
    mockedRepository.listAllForUser.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);
    mockedNotes.listAllForUser.mockResolvedValue({ success: true, data: [] });
    mockedFeedback.listAllForUser.mockResolvedValue({ success: true, data: [] });

    const result = await CalendarService.getEvents("user-1", {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
    expect(mockedHistory.listHistoryForApplications).not.toHaveBeenCalled();
  });
});

describe("CalendarService.createCustomEvent", () => {
  it("denies a Free plan user before creating anything", async () => {
    mockedBilling.requireProPlan.mockResolvedValue({
      success: false,
      error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await CalendarService.createCustomEvent("user-1", {
      type: "custom",
      title: "Prep",
      eventDate: "2026-01-01",
    });

    expect(result.success).toBe(false);
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("verifies an optional applicationId belongs to the user before creating the event", async () => {
    allowPro();
    mockedApplications.getById.mockResolvedValue({
      success: false,
      error: { message: "Application not found.", code: ERROR_CODES.NOT_FOUND },
    });

    const result = await CalendarService.createCustomEvent("user-1", {
      type: "custom",
      title: "Prep",
      eventDate: "2026-01-01",
      applicationId: "someone-elses-app",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("trims title/description and creates the event once ownership (if any) is confirmed", async () => {
    allowPro();
    mockedRepository.create.mockResolvedValue({
      data: { id: "event-1" },
      error: null,
    } as never);

    const result = await CalendarService.createCustomEvent("user-1", {
      type: "reminder",
      title: "  Call recruiter  ",
      description: "  Ask about timeline  ",
      eventDate: "2026-01-01",
    });

    expect(result.success).toBe(true);
    expect(mockedApplications.getById).not.toHaveBeenCalled();
    expect(mockedRepository.create).toHaveBeenCalledWith({
      user_id: "user-1",
      application_id: null,
      type: "reminder",
      title: "Call recruiter",
      description: "Ask about timeline",
      event_date: "2026-01-01",
    });
  });
});

describe("CalendarService.updateCustomEvent", () => {
  it("returns Not Found when the repository finds no matching row (wrong owner or already archived)", async () => {
    allowPro();
    mockedRepository.update.mockResolvedValue({ data: null, error: null } as never);

    const result = await CalendarService.updateCustomEvent("user-1", "event-1", {
      type: "custom",
      title: "Updated",
      eventDate: "2026-01-02",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });
});

describe("CalendarService.archiveCustomEvent", () => {
  it("returns Not Found when the repository finds no matching row", async () => {
    allowPro();
    mockedRepository.archive.mockResolvedValue({ data: null, error: null } as never);

    const result = await CalendarService.archiveCustomEvent("user-1", "event-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the archived row on success", async () => {
    allowPro();
    mockedRepository.archive.mockResolvedValue({
      data: { id: "event-1", deleted_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    } as never);

    const result = await CalendarService.archiveCustomEvent("user-1", "event-1");

    expect(result).toEqual({
      success: true,
      data: { id: "event-1", deleted_at: "2026-01-01T00:00:00.000Z" },
    });
  });
});
