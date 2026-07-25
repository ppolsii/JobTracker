import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { JOB_IMPORT_PROVIDERS } from "@/features/job-import/providers/job-import-providers.registry";
import { JobImportService } from "@/features/job-import/services/job-import.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: {
    requireProPlan: vi.fn(),
  },
}));

vi.mock("@/features/companies/services/company.service", () => ({
  CompanyService: {
    findOrCreateByName: vi.fn(),
  },
}));

vi.mock("@/features/applications/services/application.service", () => ({
  ApplicationService: {
    create: vi.fn(),
  },
}));

vi.mock("@/features/applications/services/application-note.service", () => ({
  ApplicationNoteService: {
    create: vi.fn(),
  },
}));

// The registry itself is mocked (rather than using the real
// ManualJobImportProvider) so these tests can exercise "no provider
// supports this URL" and "the provider threw" - neither reachable through
// the real, single-entry registry today.
vi.mock("@/features/job-import/providers/job-import-providers.registry", () => ({
  JOB_IMPORT_PROVIDERS: [],
}));

const mockedBilling = vi.mocked(BillingService);
const mockedCompanies = vi.mocked(CompanyService);
const mockedApplications = vi.mocked(ApplicationService);
const mockedNotes = vi.mocked(ApplicationNoteService);
// The mocked registry module exports a plain, mutable array - tests push
// stub providers onto it directly rather than mocking a function.
const providers = JOB_IMPORT_PROVIDERS;

// vitest.config.ts's global `clearMocks` resets every vi.fn()'s call
// history/implementation between tests, but the mocked registry module
// exports a plain array, not a mock function - it would otherwise keep
// accumulating stub providers across tests.
beforeEach(() => {
  providers.length = 0;
});

function allowPro() {
  mockedBilling.requireProPlan.mockResolvedValue({
    success: true,
    data: true,
  });
}

function denyPro() {
  mockedBilling.requireProPlan.mockResolvedValue({
    success: false,
    error: { message: "This feature requires a Pro plan.", code: ERROR_CODES.FORBIDDEN },
  });
}

describe("JobImportService.extract", () => {
  it("denies a Free plan user before ever selecting a provider ('do not duplicate Pro gating logic')", async () => {
    denyPro();

    const result = await JobImportService.extract("user-1", "https://example.com");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
  });

  it("returns a validation error when no provider supports the URL", async () => {
    allowPro();
    providers.length = 0;

    const result = await JobImportService.extract(
      "user-1",
      "https://unsupported.example.com/job/1"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
  });

  it("returns the extracted data and provider name when a provider matches", async () => {
    allowPro();
    providers.push({
      name: "stub",
      supports: () => true,
      extract: async (url) => ({
        company: "Acme",
        position: "Backend Engineer",
        location: "Remote",
        work_mode: "Remote",
        employment_type: "Full Time",
        salary_min: 60000,
        salary_max: 90000,
        currency: "EUR",
        job_url: url,
        description: "Great role.",
      }),
    });

    const result = await JobImportService.extract(
      "user-1",
      "https://example.com/job/1"
    );

    expect(result).toEqual({
      success: true,
      data: {
        company: "Acme",
        position: "Backend Engineer",
        location: "Remote",
        work_mode: "Remote",
        employment_type: "Full Time",
        salary_min: 60000,
        salary_max: 90000,
        currency: "EUR",
        job_url: "https://example.com/job/1",
        description: "Great role.",
        providerName: "stub",
      },
    });
  });

  it("never exposes a provider's own thrown error, only a generic message", async () => {
    allowPro();
    providers.push({
      name: "flaky",
      supports: () => true,
      extract: async () => {
        throw new Error("connection reset by peer at 10.0.0.1:443");
      },
    });

    const result = await JobImportService.extract(
      "user-1",
      "https://example.com/job/1"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(result.error.message).not.toContain("10.0.0.1");
      expect(result.error.message).not.toContain("connection reset");
    }
  });
});

describe("JobImportService.confirmImport", () => {
  it("denies a Free plan user before resolving the company or creating anything", async () => {
    denyPro();

    const result = await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedCompanies.findOrCreateByName).not.toHaveBeenCalled();
    expect(mockedApplications.create).not.toHaveBeenCalled();
  });

  it("resolves the company by name, then creates the application through ApplicationService (still enforcing its own rules)", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: true,
      data: { id: "company-1" },
    });
    mockedApplications.create.mockResolvedValue({
      success: true,
      data: { id: "app-1" },
    } as never);

    const result = await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
    });

    expect(result.success).toBe(true);
    expect(mockedCompanies.findOrCreateByName).toHaveBeenCalledWith(
      "user-1",
      "Acme"
    );
    expect(mockedApplications.create).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        company_id: "company-1",
        cv_version_id: "cv-1",
        position: "Backend Engineer",
      })
    );
  });

  it("propagates a company-resolution failure without creating an application", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
    });

    expect(result.success).toBe(false);
    expect(mockedApplications.create).not.toHaveBeenCalled();
  });

  it("propagates an application-creation failure (e.g. the Free plan limit) unchanged", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: true,
      data: { id: "company-1" },
    });
    mockedApplications.create.mockResolvedValue({
      success: false,
      error: { message: "The Free plan is limited to 15 applications.", code: ERROR_CODES.FORBIDDEN },
    } as never);

    const result = await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedNotes.create).not.toHaveBeenCalled();
  });

  it("attaches the description as the application's first note when provided", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: true,
      data: { id: "company-1" },
    });
    mockedApplications.create.mockResolvedValue({
      success: true,
      data: { id: "app-1" },
    } as never);
    mockedNotes.create.mockResolvedValue({
      success: true,
      data: { id: "note-1" },
    } as never);

    await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
      description: "Great role.",
    });

    expect(mockedNotes.create).toHaveBeenCalledWith(
      "user-1",
      "app-1",
      "Great role."
    );
  });

  it("does not attach a note when no description was provided", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: true,
      data: { id: "company-1" },
    });
    mockedApplications.create.mockResolvedValue({
      success: true,
      data: { id: "app-1" },
    } as never);

    await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
    });

    expect(mockedNotes.create).not.toHaveBeenCalled();
  });

  it("still returns the created application even if attaching the note fails", async () => {
    allowPro();
    mockedCompanies.findOrCreateByName.mockResolvedValue({
      success: true,
      data: { id: "company-1" },
    });
    mockedApplications.create.mockResolvedValue({
      success: true,
      data: { id: "app-1" },
    } as never);
    mockedNotes.create.mockResolvedValue({
      success: false,
      error: { message: "Something went wrong.", code: ERROR_CODES.INTERNAL_ERROR },
    });

    const result = await JobImportService.confirmImport("user-1", {
      company: "Acme",
      cv_version_id: "cv-1",
      position: "Backend Engineer",
      description: "Great role.",
    });

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
  });
});
