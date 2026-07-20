import { describe, expect, it, vi } from "vitest";

import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import { ExportService } from "@/features/export/services/export.service";

vi.mock("@/features/companies/services/company.service", () => ({
  CompanyService: { listAllIncludingArchived: vi.fn() },
}));
vi.mock("@/features/cv/services/cv-version.service", () => ({
  CVVersionService: { listAllIncludingArchived: vi.fn() },
}));
vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: { listAllIncludingArchived: vi.fn() },
}));
vi.mock("@/features/applications/services/application-note.service", () => ({
  ApplicationNoteService: { listAllForUser: vi.fn() },
}));
vi.mock("@/features/applications/services/application-status.service", () => ({
  ApplicationStatusService: { listHistoryForApplications: vi.fn() },
}));

const mockedCompanies = vi.mocked(CompanyService);
const mockedCvVersions = vi.mocked(CVVersionService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedNotes = vi.mocked(ApplicationNoteService);
const mockedStatusHistory = vi.mocked(ApplicationStatusService);

function setUpSuccessfulMocks() {
  mockedCompanies.listAllIncludingArchived.mockResolvedValue({
    success: true,
    data: [{ id: "c1", name: "Acme" }],
  } as never);
  mockedCvVersions.listAllIncludingArchived.mockResolvedValue({
    success: true,
    data: [{ id: "cv1", name: "Backend CV" }],
  } as never);
  mockedApplications.listAllIncludingArchived.mockResolvedValue({
    success: true,
    data: [{ id: "a1", position: "Backend Engineer" }],
  } as never);
  mockedNotes.listAllForUser.mockResolvedValue({
    success: true,
    data: [{ id: "n1", application_id: "a1", content: "note" }],
  } as never);
  mockedStatusHistory.listHistoryForApplications.mockResolvedValue({
    success: true,
    data: [{ id: "h1", application_id: "a1", new_status: "Applied" }],
  } as never);
}

describe("ExportService.exportJSON", () => {
  it("uses each entity's archived-inclusive read, not the paginated list used elsewhere", async () => {
    setUpSuccessfulMocks();

    await ExportService.exportJSON("user-1");

    expect(mockedCompanies.listAllIncludingArchived).toHaveBeenCalledWith(
      "user-1"
    );
    expect(mockedCvVersions.listAllIncludingArchived).toHaveBeenCalledWith(
      "user-1"
    );
    expect(mockedApplications.listAllIncludingArchived).toHaveBeenCalledWith(
      "user-1"
    );
  });

  it("includes every user-owned entity, including status history, in the JSON bundle", async () => {
    setUpSuccessfulMocks();

    const result = await ExportService.exportJSON("user-1");

    expect(result.success).toBe(true);
    if (result.success) {
      const payload = JSON.parse(result.data);
      expect(Object.keys(payload).sort()).toEqual(
        [
          "applications",
          "companies",
          "cvVersions",
          "notes",
          "statusHistory",
        ].sort()
      );
      expect(payload.companies).toEqual([{ id: "c1", name: "Acme" }]);
      expect(payload.statusHistory).toEqual([
        { id: "h1", application_id: "a1", new_status: "Applied" },
      ]);
    }
  });

  it("fetches status history for every application id returned, including archived ones", async () => {
    setUpSuccessfulMocks();
    mockedApplications.listAllIncludingArchived.mockResolvedValue({
      success: true,
      data: [{ id: "a1" }, { id: "a2" }],
    } as never);

    await ExportService.exportJSON("user-1");

    expect(mockedStatusHistory.listHistoryForApplications).toHaveBeenCalledWith(
      ["a1", "a2"]
    );
  });

  it("propagates a failure from any one Service rather than silently dropping data", async () => {
    setUpSuccessfulMocks();
    mockedNotes.listAllForUser.mockResolvedValue({
      success: false,
      error: { message: "boom", code: "INTERNAL_ERROR" },
    } as never);

    const result = await ExportService.exportJSON("user-1");

    expect(result.success).toBe(false);
  });
});

describe("ExportService.exportCSV", () => {
  it("uses the archived-inclusive application read, not the paginated list", async () => {
    mockedApplications.listAllIncludingArchived.mockResolvedValue({
      success: true,
      data: [],
    } as never);

    await ExportService.exportCSV("user-1");

    expect(mockedApplications.listAllIncludingArchived).toHaveBeenCalledWith(
      "user-1"
    );
  });
});
