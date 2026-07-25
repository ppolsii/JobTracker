import { describe, expect, it, vi } from "vitest";

import { ApplicationRepository } from "@/features/applications/repositories/application.repository";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { CompanyRepository } from "@/features/companies/repositories/company.repository";
import { CVVersionRepository } from "@/features/cv/repositories/cv-version.repository";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";

// Production Readiness Audit (IMPLEMENTATION_ORDER_V2.md Phase 39): this
// Service had no dedicated test file despite owning the application's most
// central business logic (capacity gating, cross-table reference
// validation, and Postgres constraint/FK-violation-to-friendly-message
// mapping) - see the Production Audit Report's Test Coverage findings.
vi.mock("@/features/applications/repositories/application.repository", () => ({
  ApplicationRepository: {
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    listArchived: vi.fn(),
    findById: vi.fn(),
    listAllForAnalytics: vi.fn(),
    list: vi.fn(),
    listAllIncludingArchived: vi.fn(),
  },
}));

vi.mock("@/features/billing/services/billing.service", () => ({
  BillingService: { requireApplicationCapacity: vi.fn() },
}));

vi.mock("@/features/companies/repositories/company.repository", () => ({
  CompanyRepository: { findActiveById: vi.fn() },
}));

vi.mock("@/features/cv/repositories/cv-version.repository", () => ({
  CVVersionRepository: { findActiveById: vi.fn() },
}));

const mockedApplications = vi.mocked(ApplicationRepository);
const mockedBilling = vi.mocked(BillingService);
const mockedCompanies = vi.mocked(CompanyRepository);
const mockedCvVersions = vi.mocked(CVVersionRepository);

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    company_id: "company-1",
    cv_version_id: "cv-1",
    position: "Backend Engineer",
    application_date: "2026-01-01",
    job_url: undefined,
    location: undefined,
    work_mode: undefined,
    employment_type: undefined,
    source: undefined,
    salary_min: undefined,
    salary_max: undefined,
    currency: undefined,
    ...overrides,
  } as never;
}

function listParams(overrides: Record<string, unknown> = {}) {
  return { page: 1, limit: 20, sort_by: "created_at", sort_dir: "desc", ...overrides } as never;
}

function allowCapacity() {
  mockedBilling.requireApplicationCapacity.mockResolvedValue({ success: true, data: true });
}

function allowReferences() {
  mockedCompanies.findActiveById.mockResolvedValue({ data: { id: "company-1" }, error: null } as never);
  mockedCvVersions.findActiveById.mockResolvedValue({ data: { id: "cv-1" }, error: null } as never);
}

describe("ApplicationService.create", () => {
  it("denies creation when the Free plan's application capacity is reached", async () => {
    mockedBilling.requireApplicationCapacity.mockResolvedValue({
      success: false,
      error: { message: "The Free plan is limited to 15 applications.", code: ERROR_CODES.FORBIDDEN },
    });

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
    expect(mockedCompanies.findActiveById).not.toHaveBeenCalled();
    expect(mockedApplications.create).not.toHaveBeenCalled();
  });

  it("rejects a company that is not found or archived", async () => {
    allowCapacity();
    mockedCompanies.findActiveById.mockResolvedValue({ data: null, error: null } as never);
    mockedCvVersions.findActiveById.mockResolvedValue({ data: { id: "cv-1" }, error: null } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain("company");
    }
    expect(mockedApplications.create).not.toHaveBeenCalled();
  });

  it("rejects a CV version that is not found or archived", async () => {
    allowCapacity();
    mockedCompanies.findActiveById.mockResolvedValue({ data: { id: "company-1" }, error: null } as never);
    mockedCvVersions.findActiveById.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain("CV version");
    }
  });

  it("validates references in parallel, not sequentially (both repositories are always called)", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    await ApplicationService.create("user-1", createInput());

    expect(mockedCompanies.findActiveById).toHaveBeenCalledWith("user-1", "company-1");
    expect(mockedCvVersions.findActiveById).toHaveBeenCalledWith("user-1", "cv-1");
  });

  it("maps a CHECK constraint violation to a friendly salary-range message", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.CHECK_VIOLATION, message: "applications_salary_range_check violated" },
    } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain("salary");
    }
  });

  it("maps a CHECK constraint violation to a friendly future-date message", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.CHECK_VIOLATION, message: "applications_date_not_future_check violated" },
    } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("future");
    }
  });

  it("falls back to a generic message for an unrecognized CHECK violation", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.CHECK_VIOLATION, message: "some_other_check violated" },
    } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("This application has invalid data.");
    }
  });

  it("maps a FOREIGN KEY violation (a race with a just-archived reference) to a Conflict", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION, message: "fk violated" },
    } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("returns a generic Internal Error for any other database failure", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({
      data: null,
      error: { code: "unknown", message: "db down" },
    } as never);

    const result = await ApplicationService.create("user-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("trims the position and normalizes optional fields on success", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    const result = await ApplicationService.create(
      "user-1",
      createInput({ position: "  Backend Engineer  ", job_url: "" })
    );

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
    expect(mockedApplications.create).toHaveBeenCalledWith(
      expect.objectContaining({ position: "Backend Engineer", job_url: null })
    );
  });

  it("uppercases and trims an explicit currency, defaulting when blank", async () => {
    allowCapacity();
    allowReferences();
    mockedApplications.create.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    await ApplicationService.create("user-1", createInput({ currency: " usd " }));

    expect(mockedApplications.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD" })
    );
  });
});

describe("ApplicationService.update", () => {
  it("rejects an archived/missing company or CV version the same way create does", async () => {
    mockedCompanies.findActiveById.mockResolvedValue({ data: null, error: null } as never);
    mockedCvVersions.findActiveById.mockResolvedValue({ data: { id: "cv-1" }, error: null } as never);

    const result = await ApplicationService.update("user-1", "app-1", createInput());

    expect(result.success).toBe(false);
    expect(mockedApplications.update).not.toHaveBeenCalled();
  });

  it("returns Not Found when the repository finds no matching row", async () => {
    allowReferences();
    mockedApplications.update.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.update("user-1", "app-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("maps constraint/FK violations the same way create does", async () => {
    allowReferences();
    mockedApplications.update.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION, message: "fk violated" },
    } as never);

    const result = await ApplicationService.update("user-1", "app-1", createInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("returns the updated application on success", async () => {
    allowReferences();
    mockedApplications.update.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    const result = await ApplicationService.update("user-1", "app-1", createInput());

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
  });
});

describe("ApplicationService.archive", () => {
  it("returns Not Found when the repository finds no matching row", async () => {
    mockedApplications.archive.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.archive("user-1", "app-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the archived application on success", async () => {
    mockedApplications.archive.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    const result = await ApplicationService.archive("user-1", "app-1");

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
  });
});

describe("ApplicationService.restore", () => {
  it("returns Not Found when the repository finds no matching archived row", async () => {
    mockedApplications.restore.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.restore("user-1", "app-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the restored application on success", async () => {
    mockedApplications.restore.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    const result = await ApplicationService.restore("user-1", "app-1");

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
  });
});

describe("ApplicationService.getById", () => {
  it("returns Not Found when the application doesn't exist or isn't owned by this user", async () => {
    mockedApplications.findById.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.getById("user-1", "app-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the application on success", async () => {
    mockedApplications.findById.mockResolvedValue({ data: { id: "app-1" }, error: null } as never);

    const result = await ApplicationService.getById("user-1", "app-1");

    expect(result).toEqual({ success: true, data: { id: "app-1" } });
  });
});

describe("ApplicationService.list/listArchived/listAllForAnalytics/listAllIncludingArchived", () => {
  it("list: propagates a repository failure as an Internal Error", async () => {
    mockedApplications.list.mockResolvedValue({ data: null, error: { message: "db down" }, count: null } as never);

    const result = await ApplicationService.list("user-1", listParams());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("list: defaults to an empty page on success with no rows", async () => {
    mockedApplications.list.mockResolvedValue({ data: null, error: null, count: null } as never);

    const result = await ApplicationService.list("user-1", listParams());

    expect(result).toEqual({
      success: true,
      data: { applications: [], total: 0, page: 1, limit: 20 },
    });
  });

  it("listArchived: propagates a repository failure as an Internal Error", async () => {
    mockedApplications.listArchived.mockResolvedValue({ data: null, error: { message: "db down" }, count: null } as never);

    const result = await ApplicationService.listArchived("user-1", { page: 1, limit: 20 });

    expect(result.success).toBe(false);
  });

  it("listAllForAnalytics: defaults to an empty array when data is null", async () => {
    mockedApplications.listAllForAnalytics.mockResolvedValue({ data: null, error: null } as never);

    const result = await ApplicationService.listAllForAnalytics("user-1");

    expect(result).toEqual({ success: true, data: [] });
  });

  it("listAllIncludingArchived: propagates a repository failure as an Internal Error", async () => {
    mockedApplications.listAllIncludingArchived.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    } as never);

    const result = await ApplicationService.listAllIncludingArchived("user-1");

    expect(result.success).toBe(false);
  });
});
