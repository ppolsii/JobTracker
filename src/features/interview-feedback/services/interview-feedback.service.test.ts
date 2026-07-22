import { describe, expect, it, vi } from "vitest";

import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import type { ApplicationStatusHistoryEntry } from "@/features/applications/types/application.types";
import { InterviewFeedbackRepository } from "@/features/interview-feedback/repositories/interview-feedback.repository";
import { InterviewFeedbackService } from "@/features/interview-feedback/services/interview-feedback.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/interview-feedback/repositories/interview-feedback.repository", () => ({
  InterviewFeedbackRepository: {
    create: vi.fn(),
    listByHistoryIds: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
}));

vi.mock("@/features/applications/services/application-status.service", () => ({
  ApplicationStatusService: {
    listHistory: vi.fn(),
  },
}));

const mockedRepository = vi.mocked(InterviewFeedbackRepository);
const mockedStatusService = vi.mocked(ApplicationStatusService);

function historyEntry(
  overrides: Partial<ApplicationStatusHistoryEntry> = {}
): ApplicationStatusHistoryEntry {
  return {
    id: "history-1",
    application_id: "app-1",
    previous_status: "Applied",
    new_status: "Recruiter Contact",
    changed_at: "2026-01-02T00:00:00.000Z",
    created_by: "user-1",
    ...overrides,
  };
}

describe("InterviewFeedbackService.create", () => {
  it("returns Not Found when the application itself is not owned by this user", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: false,
      error: { message: "Application not found.", code: ERROR_CODES.NOT_FOUND },
    });

    const result = await InterviewFeedbackService.create(
      "user-1",
      "app-1",
      "history-1",
      { notes: "Went well." }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("returns Not Found when the history entry does not belong to this application (id substitution)", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: true,
      data: [historyEntry({ id: "history-1" })],
    });

    const result = await InterviewFeedbackService.create(
      "user-1",
      "app-1",
      "someone-elses-history-id",
      { notes: "Went well." }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("creates feedback once the history entry is confirmed to belong to the application", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: true,
      data: [historyEntry({ id: "history-1" })],
    });
    mockedRepository.create.mockResolvedValue({
      data: { id: "feedback-1" },
      error: null,
    } as never);

    const result = await InterviewFeedbackService.create(
      "user-1",
      "app-1",
      "history-1",
      { rating: 4, format: "Video", notes: "  Went well.  " }
    );

    expect(result.success).toBe(true);
    expect(mockedRepository.create).toHaveBeenCalledWith({
      application_status_history_id: "history-1",
      user_id: "user-1",
      rating: 4,
      format: "Video",
      notes: "Went well.",
    });
  });

  it("defaults rating and format to null when not provided", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: true,
      data: [historyEntry({ id: "history-1" })],
    });
    mockedRepository.create.mockResolvedValue({
      data: { id: "feedback-1" },
      error: null,
    } as never);

    await InterviewFeedbackService.create("user-1", "app-1", "history-1", {
      notes: "Just notes.",
    });

    expect(mockedRepository.create).toHaveBeenCalledWith({
      application_status_history_id: "history-1",
      user_id: "user-1",
      rating: null,
      format: null,
      notes: "Just notes.",
    });
  });
});

describe("InterviewFeedbackService.listForApplication", () => {
  it("returns an empty list without querying feedback when the application has no history yet", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: true,
      data: [],
    });

    const result = await InterviewFeedbackService.listForApplication(
      "user-1",
      "app-1"
    );

    expect(result).toEqual({ success: true, data: [] });
    expect(mockedRepository.listByHistoryIds).not.toHaveBeenCalled();
  });

  it("fetches feedback for every history entry id belonging to the application", async () => {
    mockedStatusService.listHistory.mockResolvedValue({
      success: true,
      data: [
        historyEntry({ id: "history-1" }),
        historyEntry({ id: "history-2" }),
      ],
    });
    mockedRepository.listByHistoryIds.mockResolvedValue({
      data: [{ id: "feedback-1" }],
      error: null,
    } as never);

    const result = await InterviewFeedbackService.listForApplication(
      "user-1",
      "app-1"
    );

    expect(result).toEqual({ success: true, data: [{ id: "feedback-1" }] });
    expect(mockedRepository.listByHistoryIds).toHaveBeenCalledWith("user-1", [
      "history-1",
      "history-2",
    ]);
  });
});

describe("InterviewFeedbackService.update", () => {
  it("returns Not Found when the repository finds no matching row (wrong owner or already archived)", async () => {
    mockedRepository.update.mockResolvedValue({ data: null, error: null } as never);

    const result = await InterviewFeedbackService.update("user-1", "feedback-1", {
      notes: "Updated.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("trims notes and defaults rating/format to null when updating", async () => {
    mockedRepository.update.mockResolvedValue({
      data: { id: "feedback-1" },
      error: null,
    } as never);

    await InterviewFeedbackService.update("user-1", "feedback-1", {
      notes: "  Updated.  ",
    });

    expect(mockedRepository.update).toHaveBeenCalledWith("user-1", "feedback-1", {
      rating: null,
      format: null,
      notes: "Updated.",
    });
  });
});

describe("InterviewFeedbackService.archive", () => {
  it("returns Not Found when the repository finds no matching row", async () => {
    mockedRepository.archive.mockResolvedValue({ data: null, error: null } as never);

    const result = await InterviewFeedbackService.archive("user-1", "feedback-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the archived row on success", async () => {
    mockedRepository.archive.mockResolvedValue({
      data: { id: "feedback-1", deleted_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    } as never);

    const result = await InterviewFeedbackService.archive("user-1", "feedback-1");

    expect(result).toEqual({
      success: true,
      data: { id: "feedback-1", deleted_at: "2026-01-01T00:00:00.000Z" },
    });
  });
});
