import { describe, expect, it, vi } from "vitest";

import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { SearchService } from "@/features/search/services/search.service";

vi.mock("@/features/companies/services/company.service", () => ({
  CompanyService: { list: vi.fn() },
}));
vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: { list: vi.fn() },
}));
vi.mock("@/features/applications/services/application-note.service", () => ({
  ApplicationNoteService: { search: vi.fn() },
}));

const mockedCompanies = vi.mocked(CompanyService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedNotes = vi.mocked(ApplicationNoteService);

describe("SearchService.search", () => {
  it("short-circuits an empty query without calling any Service", async () => {
    const result = await SearchService.search("user-1", "");

    expect(result).toEqual({
      success: true,
      data: {
        companies: [],
        companiesTotal: 0,
        applications: [],
        applicationsTotal: 0,
        notes: [],
        notesTotal: 0,
      },
    });
    expect(mockedCompanies.list).not.toHaveBeenCalled();
    expect(mockedApplications.list).not.toHaveBeenCalled();
    expect(mockedNotes.search).not.toHaveBeenCalled();
  });

  it("searches all three entities in parallel and maps each to its lean result shape, with totals", async () => {
    mockedCompanies.list.mockResolvedValue({
      success: true,
      data: {
        companies: [{ id: "c1", name: "Acme" }],
        total: 1,
        page: 1,
        limit: 5,
      },
    } as never);
    mockedApplications.list.mockResolvedValue({
      success: true,
      data: {
        applications: [
          {
            id: "a1",
            position: "Backend Engineer",
            companies: { name: "Acme" },
          },
        ],
        total: 1,
        page: 1,
        limit: 5,
      },
    } as never);
    mockedNotes.search.mockResolvedValue({
      success: true,
      data: {
        notes: [
          {
            id: "n1",
            application_id: "a1",
            content: "Great call",
            applications: { position: "Backend Engineer" },
          },
        ],
        total: 1,
      },
    } as never);

    const result = await SearchService.search("user-1", "acme");

    expect(result).toEqual({
      success: true,
      data: {
        companies: [{ id: "c1", name: "Acme" }],
        companiesTotal: 1,
        applications: [
          { id: "a1", position: "Backend Engineer", companyName: "Acme" },
        ],
        applicationsTotal: 1,
        notes: [
          {
            id: "n1",
            applicationId: "a1",
            content: "Great call",
            applicationPosition: "Backend Engineer",
          },
        ],
        notesTotal: 1,
      },
    });
  });

  it("defaults every entity to page 1 with the dropdown's SEARCH_RESULT_LIMIT when no params are given", async () => {
    mockedCompanies.list.mockResolvedValue({
      success: true,
      data: { companies: [], total: 0, page: 1, limit: 5 },
    } as never);
    mockedApplications.list.mockResolvedValue({
      success: true,
      data: { applications: [], total: 0, page: 1, limit: 5 },
    } as never);
    mockedNotes.search.mockResolvedValue({
      success: true,
      data: { notes: [], total: 0 },
    } as never);

    await SearchService.search("user-1", "acme");

    expect(mockedCompanies.list).toHaveBeenCalledWith("user-1", {
      query: "acme",
      page: 1,
      limit: 5,
    });
    expect(mockedNotes.search).toHaveBeenCalledWith("user-1", "acme", {
      page: 1,
      limit: 5,
    });
  });

  // IMPLEMENTATION_ORDER_V2.md Phase 27: the dedicated Search page passes
  // independent per-entity page numbers and a larger limit.
  it("passes independent per-entity page numbers and a custom limit through to each Service", async () => {
    mockedCompanies.list.mockResolvedValue({
      success: true,
      data: { companies: [], total: 0, page: 2, limit: 20 },
    } as never);
    mockedApplications.list.mockResolvedValue({
      success: true,
      data: { applications: [], total: 0, page: 3, limit: 20 },
    } as never);
    mockedNotes.search.mockResolvedValue({
      success: true,
      data: { notes: [], total: 0 },
    } as never);

    await SearchService.search("user-1", "acme", {
      companiesPage: 2,
      applicationsPage: 3,
      notesPage: 1,
      limit: 20,
    });

    expect(mockedCompanies.list).toHaveBeenCalledWith("user-1", {
      query: "acme",
      page: 2,
      limit: 20,
    });
    expect(mockedApplications.list).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ page: 3, limit: 20 })
    );
    expect(mockedNotes.search).toHaveBeenCalledWith("user-1", "acme", {
      page: 1,
      limit: 20,
    });
  });

  it("propagates a failure from any one Service rather than silently dropping results", async () => {
    mockedCompanies.list.mockResolvedValue({
      success: false,
      error: { message: "boom", code: "INTERNAL_ERROR" },
    } as never);
    mockedApplications.list.mockResolvedValue({
      success: true,
      data: { applications: [], total: 0, page: 1, limit: 5 },
    } as never);
    mockedNotes.search.mockResolvedValue({
      success: true,
      data: { notes: [], total: 0 },
    } as never);

    const result = await SearchService.search("user-1", "acme");

    expect(result.success).toBe(false);
  });

  it("maps a company-less application and applicationless note gracefully to null", async () => {
    mockedCompanies.list.mockResolvedValue({
      success: true,
      data: { companies: [], total: 0, page: 1, limit: 5 },
    } as never);
    mockedApplications.list.mockResolvedValue({
      success: true,
      data: {
        applications: [
          { id: "a1", position: "Backend Engineer", companies: null },
        ],
        total: 1,
        page: 1,
        limit: 5,
      },
    } as never);
    mockedNotes.search.mockResolvedValue({
      success: true,
      data: {
        notes: [
          { id: "n1", application_id: "a1", content: "note", applications: null },
        ],
        total: 1,
      },
    } as never);

    const result = await SearchService.search("user-1", "x");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applications[0].companyName).toBeNull();
      expect(result.data.notes[0].applicationPosition).toBeNull();
    }
  });
});
