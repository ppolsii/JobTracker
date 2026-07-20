import { describe, expect, it, vi } from "vitest";

import { ApplicationStatusHistoryRepository } from "@/features/applications/repositories/application-status-history.repository";
import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/applications/repositories/application.repository", () => ({
  ApplicationRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock(
  "@/features/applications/repositories/application-status-history.repository",
  () => ({
    ApplicationStatusHistoryRepository: {
      createTransition: vi.fn(),
    },
  })
);

const mockedApplications = vi.mocked(ApplicationRepository);
const mockedHistory = vi.mocked(ApplicationStatusHistoryRepository);

function applicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-1",
    current_status: "Applied",
    application_date: "2026-01-01",
    ...overrides,
  };
}

describe("ApplicationStatusService.changeStatus", () => {
  it("returns Not Found when the application does not exist (or is not owned by this user)", async () => {
    mockedApplications.findById.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Recruiter Contact"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("rejects a transition that skips stages (BUSINESS_RULES.md: no stage-skipping)", async () => {
    mockedApplications.findById.mockResolvedValue({
      data: applicationRow({ current_status: "Wishlist" }),
      error: null,
    } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Offer"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockedHistory.createTransition).not.toHaveBeenCalled();
  });

  it("rejects any transition out of a terminal state (Accepted)", async () => {
    mockedApplications.findById.mockResolvedValue({
      data: applicationRow({ current_status: "Accepted" }),
      error: null,
    } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Applied"
    );

    expect(result.success).toBe(false);
    expect(mockedHistory.createTransition).not.toHaveBeenCalled();
  });

  it("blocks leaving Wishlist without an application date, and never records the transition", async () => {
    mockedApplications.findById.mockResolvedValue({
      data: applicationRow({
        current_status: "Wishlist",
        application_date: null,
      }),
      error: null,
    } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Applied"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockedApplications.update).not.toHaveBeenCalled();
    expect(mockedHistory.createTransition).not.toHaveBeenCalled();
  });

  it("accepts leaving Wishlist when an application date is supplied with the transition", async () => {
    mockedApplications.findById
      .mockResolvedValueOnce({
        data: applicationRow({
          current_status: "Wishlist",
          application_date: null,
        }),
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: applicationRow({
          current_status: "Applied",
          application_date: "2026-02-01",
        }),
        error: null,
      } as never);
    mockedApplications.update.mockResolvedValue({ error: null } as never);
    mockedHistory.createTransition.mockResolvedValue({ error: null } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Applied",
      "2026-02-01"
    );

    expect(result.success).toBe(true);
    expect(mockedApplications.update).toHaveBeenCalledWith("user-1", "app-1", {
      application_date: "2026-02-01",
    });
    expect(mockedHistory.createTransition).toHaveBeenCalledWith(
      "user-1",
      "app-1",
      "Wishlist",
      "Applied"
    );
  });

  it("does not touch application_date when leaving Wishlist with a date already on record", async () => {
    mockedApplications.findById
      .mockResolvedValueOnce({
        data: applicationRow({
          current_status: "Wishlist",
          application_date: "2026-01-01",
        }),
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: applicationRow({ current_status: "Applied" }),
        error: null,
      } as never);
    mockedHistory.createTransition.mockResolvedValue({ error: null } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Applied"
    );

    expect(result.success).toBe(true);
    expect(mockedApplications.update).not.toHaveBeenCalled();
  });

  it("allows a normal downstream transition that isn't leaving Wishlist", async () => {
    mockedApplications.findById
      .mockResolvedValueOnce({
        data: applicationRow({ current_status: "Applied" }),
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: applicationRow({ current_status: "Recruiter Contact" }),
        error: null,
      } as never);
    mockedHistory.createTransition.mockResolvedValue({ error: null } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Recruiter Contact"
    );

    expect(result.success).toBe(true);
    expect(mockedHistory.createTransition).toHaveBeenCalledWith(
      "user-1",
      "app-1",
      "Applied",
      "Recruiter Contact"
    );
  });

  it("allows rejecting an application from any non-terminal stage", async () => {
    mockedApplications.findById
      .mockResolvedValueOnce({
        data: applicationRow({ current_status: "Technical Interview" }),
        error: null,
      } as never)
      .mockResolvedValueOnce({
        data: applicationRow({ current_status: "Rejected" }),
        error: null,
      } as never);
    mockedHistory.createTransition.mockResolvedValue({ error: null } as never);

    const result = await ApplicationStatusService.changeStatus(
      "user-1",
      "app-1",
      "Rejected"
    );

    expect(result.success).toBe(true);
  });
});
