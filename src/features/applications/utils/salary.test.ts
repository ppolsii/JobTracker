import { describe, expect, it } from "vitest";

import { formatSalary } from "@/features/applications/utils/salary";

describe("formatSalary", () => {
  it("returns null when neither value is set", () => {
    expect(formatSalary(null, null, "EUR")).toBeNull();
    expect(formatSalary(undefined, undefined, "EUR")).toBeNull();
  });

  it("collapses an equal min/max into a single value (Phase 40 single-field salary)", () => {
    expect(formatSalary(50000, 50000, "EUR")).toBe("50000 EUR");
  });

  it("renders a genuine pre-existing range as min-max", () => {
    expect(formatSalary(50000, 60000, "EUR")).toBe("50000–60000 EUR");
  });

  it("falls back to '?' for whichever bound is missing in a partial range", () => {
    expect(formatSalary(50000, null, "EUR")).toBe("50000–? EUR");
    expect(formatSalary(null, 60000, "EUR")).toBe("?–60000 EUR");
  });
});
