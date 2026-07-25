import { describe, expect, it } from "vitest";

import { advancedAnalyticsFiltersSchema } from "@/features/analytics/schemas/advanced-analytics.schema";

describe("advancedAnalyticsFiltersSchema", () => {
  it("parses an empty object as no filters at all", () => {
    const result = advancedAnalyticsFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it("falls back to undefined for an invalid enum value rather than throwing", () => {
    const result = advancedAnalyticsFiltersSchema.parse({
      workMode: "Not A Real Mode",
      employmentType: "Not A Real Type",
      status: "Not A Real Status",
    });
    expect(result.workMode).toBeUndefined();
    expect(result.employmentType).toBeUndefined();
    expect(result.status).toBeUndefined();
  });

  it("falls back to undefined for a malformed uuid rather than throwing", () => {
    const result = advancedAnalyticsFiltersSchema.parse({
      companyId: "not-a-uuid",
      cvVersionId: "not-a-uuid",
    });
    expect(result.companyId).toBeUndefined();
    expect(result.cvVersionId).toBeUndefined();
  });

  it("accepts every valid filter combined", () => {
    const result = advancedAnalyticsFiltersSchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      cvVersionId: "550e8400-e29b-41d4-a716-446655440001",
      workMode: "Remote",
      employmentType: "Full Time",
      status: "Applied",
    });

    expect(result).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      cvVersionId: "550e8400-e29b-41d4-a716-446655440001",
      workMode: "Remote",
      employmentType: "Full Time",
      status: "Applied",
    });
  });
});
