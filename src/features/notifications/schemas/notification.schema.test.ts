import { describe, expect, it } from "vitest";

import {
  notificationFiltersSchema,
  notificationKeySchema,
} from "@/features/notifications/schemas/notification.schema";

describe("notificationFiltersSchema", () => {
  it("parses an empty object into all-undefined/false filters (no filter applied)", () => {
    const result = notificationFiltersSchema.parse({});

    expect(result.unreadOnly).toBe(false);
    expect(result.category).toBeUndefined();
    expect(result.applicationId).toBeUndefined();
    expect(result.companyId).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.query).toBeUndefined();
  });

  it("parses unreadOnly=true from a string searchParam", () => {
    expect(notificationFiltersSchema.parse({ unreadOnly: "true" }).unreadOnly).toBe(true);
  });

  it("falls back to undefined for an invalid category instead of throwing", () => {
    expect(notificationFiltersSchema.parse({ category: "not-a-category" }).category).toBeUndefined();
  });

  it("falls back to undefined for an invalid companyId instead of throwing", () => {
    expect(notificationFiltersSchema.parse({ companyId: "not-a-uuid" }).companyId).toBeUndefined();
  });

  it("accepts a valid, fully-specified set of filters", () => {
    const result = notificationFiltersSchema.parse({
      unreadOnly: "true",
      category: "goal",
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      query: "acme",
    });

    expect(result.category).toBe("goal");
    expect(result.query).toBe("acme");
  });
});

describe("notificationKeySchema", () => {
  it("requires a non-empty key", () => {
    expect(notificationKeySchema.safeParse({ key: "" }).success).toBe(false);
    expect(notificationKeySchema.safeParse({ key: "general:welcome" }).success).toBe(true);
  });
});
