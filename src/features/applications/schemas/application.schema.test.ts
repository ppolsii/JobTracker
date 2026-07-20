import { describe, expect, it } from "vitest";

import {
  archiveApplicationSchema,
  createApplicationSchema,
} from "@/features/applications/schemas/application.schema";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    company_id: VALID_UUID,
    cv_version_id: VALID_UUID,
    position: "Backend Engineer",
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("createApplicationSchema", () => {
  it("accepts the minimum required fields (Company, CV Version, Position)", () => {
    expect(createApplicationSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("rejects a missing company", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ company_id: undefined })
    );

    expect(result.success).toBe(false);
  });

  it("rejects a missing CV version", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ cv_version_id: undefined })
    );

    expect(result.success).toBe(false);
  });

  it("rejects an empty position", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ position: "" })
    );

    expect(result.success).toBe(false);
  });

  it("does not require an application date (every new application starts at Wishlist)", () => {
    const result = createApplicationSchema.safeParse(baseInput());

    expect(result.success).toBe(true);
  });

  it("rejects a salary range where the minimum exceeds the maximum", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ salary_min: 60000, salary_max: 50000 })
    );

    expect(result.success).toBe(false);
  });

  it("accepts a salary range where the minimum is below the maximum", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ salary_min: 50000, salary_max: 60000 })
    );

    expect(result.success).toBe(true);
  });

  it("accepts an equal salary_min and salary_max", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ salary_min: 50000, salary_max: 50000 })
    );

    expect(result.success).toBe(true);
  });

  it("rejects an application date in the future", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ application_date: daysFromNow(1) })
    );

    expect(result.success).toBe(false);
  });

  it("accepts an application date of today or in the past", () => {
    expect(
      createApplicationSchema.safeParse(
        baseInput({ application_date: daysFromNow(0) })
      ).success
    ).toBe(true);
    expect(
      createApplicationSchema.safeParse(
        baseInput({ application_date: daysFromNow(-30) })
      ).success
    ).toBe(true);
  });

  it("rejects a malformed application date string", () => {
    const result = createApplicationSchema.safeParse(
      baseInput({ application_date: "not-a-date" })
    );

    expect(result.success).toBe(false);
  });
});

describe("archiveApplicationSchema", () => {
  it("requires a valid UUID id", () => {
    expect(archiveApplicationSchema.safeParse({ id: "nope" }).success).toBe(
      false
    );
    expect(archiveApplicationSchema.safeParse({ id: VALID_UUID }).success).toBe(
      true
    );
  });
});
