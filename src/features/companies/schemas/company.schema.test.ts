import { describe, expect, it } from "vitest";

import {
  archiveCompanySchema,
  createCompanySchema,
  listCompaniesSchema,
} from "@/features/companies/schemas/company.schema";

describe("createCompanySchema", () => {
  it("accepts a company with only a name (FEATURES.md: only name is required)", () => {
    const result = createCompanySchema.safeParse({ name: "Acme" });

    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createCompanySchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });

  it("rejects a name that is only whitespace, after trimming", () => {
    const result = createCompanySchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects a missing name entirely", () => {
    const result = createCompanySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts every optional field when provided", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      website: "https://acme.test",
      industry: "Software",
      size: "51-200",
      country: "Spain",
      city: "Madrid",
    });

    expect(result.success).toBe(true);
  });
});

describe("archiveCompanySchema", () => {
  it("requires a valid UUID id", () => {
    expect(archiveCompanySchema.safeParse({ id: "not-a-uuid" }).success).toBe(
      false
    );
    expect(
      archiveCompanySchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
      }).success
    ).toBe(true);
  });
});

describe("listCompaniesSchema", () => {
  it("falls back to sane defaults instead of failing on malformed pagination", () => {
    const result = listCompaniesSchema.parse({
      page: "not-a-number",
      limit: "also-not",
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("caps the limit at 100 rather than erroring", () => {
    const result = listCompaniesSchema.parse({ limit: "9999" });

    expect(result.limit).toBe(20);
  });

  it("passes through a valid query, page and limit unchanged", () => {
    const result = listCompaniesSchema.parse({
      query: "acme",
      page: "2",
      limit: "50",
    });

    expect(result).toEqual({ query: "acme", page: 2, limit: 50 });
  });
});
