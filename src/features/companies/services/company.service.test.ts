import { describe, expect, it, vi } from "vitest";

import { CompanyRepository } from "@/features/companies/repositories/company.repository";
import { CompanyService } from "@/features/companies/services/company.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";

// Repository is mocked at the module boundary - CompanyService is the unit
// under test, and the Repository is a trusted, already-tested-elsewhere
// seam (ARCHITECTURE.md "Services own business rules... Repositories:
// persistence only"). This is an integration test of the Service's own
// orchestration/business-rule logic, not of Supabase itself.
vi.mock("@/features/companies/repositories/company.repository", () => ({
  CompanyRepository: {
    findActiveByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    countActiveApplications: vi.fn(),
    list: vi.fn(),
  },
}));

const mockedRepository = vi.mocked(CompanyRepository);

describe("CompanyService.create", () => {
  it("rejects a duplicate name before ever calling insert (BUSINESS_RULES.md: names are unique per user)", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: { id: "existing-id" },
      error: null,
    } as never);

    const result = await CompanyService.create("user-1", { name: "Acme" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("creates the company when no active duplicate exists", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.create.mockResolvedValue({
      data: { id: "new-id", name: "Acme" },
      error: null,
    } as never);

    const result = await CompanyService.create("user-1", { name: "Acme" });

    expect(result.success).toBe(true);
    expect(mockedRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", name: "Acme" })
    );
  });

  it("falls back to a friendly duplicate error if the database's unique index rejects a race", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.UNIQUE_VIOLATION },
    } as never);

    const result = await CompanyService.create("user-1", { name: "Acme" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("normalizes blank optional fields to null rather than storing empty strings", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.create.mockResolvedValue({
      data: { id: "new-id", name: "Acme" },
      error: null,
    } as never);

    await CompanyService.create("user-1", { name: "Acme", website: "   " });

    expect(mockedRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ website: null })
    );
  });
});

describe("CompanyService.update", () => {
  it("allows renaming a company to its own current name", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: { id: "company-1" },
      error: null,
    } as never);
    mockedRepository.update.mockResolvedValue({
      data: { id: "company-1", name: "Acme" },
      error: null,
    } as never);

    const result = await CompanyService.update("user-1", "company-1", {
      name: "Acme",
    });

    expect(result.success).toBe(true);
  });

  it("rejects renaming a company to a name already used by a different company", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: { id: "some-other-company" },
      error: null,
    } as never);

    const result = await CompanyService.update("user-1", "company-1", {
      name: "Acme",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
    expect(mockedRepository.update).not.toHaveBeenCalled();
  });
});

describe("CompanyService.archive", () => {
  it("blocks archiving a company referenced by active applications (BUSINESS_RULES.md 'Company Rules')", async () => {
    mockedRepository.countActiveApplications.mockResolvedValue({
      count: 2,
      error: null,
    } as never);

    const result = await CompanyService.archive("user-1", "company-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
      expect(result.error.message).toContain("2 applications");
    }
    expect(mockedRepository.archive).not.toHaveBeenCalled();
  });

  it("uses singular wording for exactly one referencing application", async () => {
    mockedRepository.countActiveApplications.mockResolvedValue({
      count: 1,
      error: null,
    } as never);

    const result = await CompanyService.archive("user-1", "company-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("1 application.");
    }
  });

  it("allows archiving a company with no referencing applications", async () => {
    mockedRepository.countActiveApplications.mockResolvedValue({
      count: 0,
      error: null,
    } as never);
    mockedRepository.archive.mockResolvedValue({
      data: { id: "company-1", name: "Acme" },
      error: null,
    } as never);

    const result = await CompanyService.archive("user-1", "company-1");

    expect(result.success).toBe(true);
    expect(mockedRepository.archive).toHaveBeenCalledWith(
      "user-1",
      "company-1"
    );
  });
});
