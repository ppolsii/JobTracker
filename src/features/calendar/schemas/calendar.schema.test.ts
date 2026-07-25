import { describe, expect, it } from "vitest";

import {
  archiveCalendarEventSchema,
  calendarFiltersSchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "@/features/calendar/schemas/calendar.schema";

describe("calendarFiltersSchema", () => {
  it("parses an empty object into all-undefined filters (no filter applied)", () => {
    const result = calendarFiltersSchema.parse({});

    expect(result).toEqual({
      companyId: undefined,
      eventType: undefined,
      applicationStatus: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      workMode: undefined,
      employmentType: undefined,
      query: undefined,
    });
  });

  it("falls back to undefined for an invalid companyId instead of throwing", () => {
    const result = calendarFiltersSchema.parse({ companyId: "not-a-uuid" });
    expect(result.companyId).toBeUndefined();
  });

  it("falls back to undefined for an invalid eventType instead of throwing", () => {
    const result = calendarFiltersSchema.parse({ eventType: "not-a-type" });
    expect(result.eventType).toBeUndefined();
  });

  it("accepts a valid, fully-specified set of filters", () => {
    const result = calendarFiltersSchema.parse({
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "interview",
      applicationStatus: "HR Interview",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      workMode: "Remote",
      employmentType: "Full Time",
      query: "acme",
    });

    expect(result.companyId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.eventType).toBe("interview");
    expect(result.query).toBe("acme");
  });
});

function validEventInput(overrides: Record<string, unknown> = {}) {
  return {
    type: "custom",
    title: "Prep for interview",
    eventDate: "2026-01-01",
    ...overrides,
  };
}

describe("createCalendarEventSchema", () => {
  it("accepts a minimal valid custom event (no description/application)", () => {
    const result = createCalendarEventSchema.safeParse(validEventInput());
    expect(result.success).toBe(true);
  });

  it("accepts 'reminder' as a valid type", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({ type: "reminder" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects a type outside reminder/custom (status-derived types cannot be user-created)", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({ type: "interview" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({ title: "   " })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty date", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({ eventDate: "" })
    );
    expect(result.success).toBe(false);
  });

  it("rejects an applicationId that is not a UUID", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({ applicationId: "not-a-uuid" })
    );
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed optional applicationId and description", () => {
    const result = createCalendarEventSchema.safeParse(
      validEventInput({
        applicationId: "550e8400-e29b-41d4-a716-446655440000",
        description: "Bring resume copies.",
      })
    );
    expect(result.success).toBe(true);
  });
});

describe("updateCalendarEventSchema", () => {
  it("requires a valid id in addition to the create fields", () => {
    const missingId = updateCalendarEventSchema.safeParse(validEventInput());
    expect(missingId.success).toBe(false);

    const withId = updateCalendarEventSchema.safeParse(
      validEventInput({ id: "550e8400-e29b-41d4-a716-446655440000" })
    );
    expect(withId.success).toBe(true);
  });
});

describe("archiveCalendarEventSchema", () => {
  it("requires a valid uuid id", () => {
    expect(archiveCalendarEventSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
      false
    );
    expect(
      archiveCalendarEventSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }).success
    ).toBe(true);
  });
});
