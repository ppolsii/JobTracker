import { describe, expect, it } from "vitest";

import {
  confirmJobImportSchema,
  extractJobUrlSchema,
} from "@/features/job-import/schemas/job-import.schema";

describe("extractJobUrlSchema", () => {
  it("rejects an empty URL", () => {
    const result = extractJobUrlSchema.safeParse({ url: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a value that isn't a well-formed URL", () => {
    const result = extractJobUrlSchema.safeParse({ url: "not a url" });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed URL", () => {
    const result = extractJobUrlSchema.safeParse({
      url: "https://example.com/jobs/123",
    });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    const result = extractJobUrlSchema.safeParse({
      url: "  https://example.com/jobs/123  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/jobs/123");
    }
  });
});

function validImportInput(overrides: Record<string, unknown> = {}) {
  return {
    company: "Acme",
    cv_version_id: "550e8400-e29b-41d4-a716-446655440000",
    position: "Backend Engineer",
    ...overrides,
  };
}

describe("confirmJobImportSchema", () => {
  it("accepts the minimum required fields", () => {
    const result = confirmJobImportSchema.safeParse(validImportInput());
    expect(result.success).toBe(true);
  });

  it("requires a non-empty company", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ company: "" })
    );
    expect(result.success).toBe(false);
  });

  it("requires a valid CV version id", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ cv_version_id: "not-a-uuid" })
    );
    expect(result.success).toBe(false);
  });

  it("requires a non-empty position", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ position: "" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects a minimum salary greater than the maximum", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ salary_min: 90000, salary_max: 60000 })
    );
    expect(result.success).toBe(false);
  });

  it("accepts a minimum salary less than or equal to the maximum", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ salary_min: 60000, salary_max: 90000 })
    );
    expect(result.success).toBe(true);
  });

  it("rejects an application date in the future", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const result = confirmJobImportSchema.safeParse(
      validImportInput({
        application_date: nextYear.toISOString().slice(0, 10),
      })
    );
    expect(result.success).toBe(false);
  });

  it("accepts an optional description", () => {
    const result = confirmJobImportSchema.safeParse(
      validImportInput({ description: "A promising role." })
    );
    expect(result.success).toBe(true);
  });
});
