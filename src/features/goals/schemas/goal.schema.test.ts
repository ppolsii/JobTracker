import { describe, expect, it } from "vitest";

import {
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from "@/features/goals/schemas/goal.schema";

function validGoalInput(overrides: Record<string, unknown> = {}) {
  return {
    metric: "applications",
    period: "weekly",
    targetValue: 5,
    ...overrides,
  };
}

describe("createGoalSchema", () => {
  it("accepts a minimal valid goal (no title)", () => {
    const result = createGoalSchema.safeParse(validGoalInput());
    expect(result.success).toBe(true);
  });

  it("rejects a metric outside the four supported ones", () => {
    const result = createGoalSchema.safeParse(validGoalInput({ metric: "custom" }));
    expect(result.success).toBe(false);
  });

  it("rejects a period outside the five supported ones", () => {
    const result = createGoalSchema.safeParse(validGoalInput({ period: "daily" }));
    expect(result.success).toBe(false);
  });

  it("coerces a numeric string targetValue (from a number input) to a number", () => {
    const result = createGoalSchema.safeParse(validGoalInput({ targetValue: "10" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetValue).toBe(10);
    }
  });

  it("rejects a zero or negative target", () => {
    expect(createGoalSchema.safeParse(validGoalInput({ targetValue: 0 })).success).toBe(false);
    expect(createGoalSchema.safeParse(validGoalInput({ targetValue: -5 })).success).toBe(false);
  });

  it("rejects a fractional target", () => {
    const result = createGoalSchema.safeParse(validGoalInput({ targetValue: 2.5 }));
    expect(result.success).toBe(false);
  });

  it("accepts an optional title", () => {
    const result = createGoalSchema.safeParse(validGoalInput({ title: "My goal" }));
    expect(result.success).toBe(true);
  });
});

describe("updateGoalSchema", () => {
  it("requires a valid id in addition to the create fields", () => {
    expect(updateGoalSchema.safeParse(validGoalInput()).success).toBe(false);
    expect(
      updateGoalSchema.safeParse(
        validGoalInput({ id: "550e8400-e29b-41d4-a716-446655440000" })
      ).success
    ).toBe(true);
  });
});

describe("goalIdSchema", () => {
  it("requires a valid uuid id (used by pause/reactivate/archive/delete alike)", () => {
    expect(goalIdSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    expect(
      goalIdSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" }).success
    ).toBe(true);
  });
});
