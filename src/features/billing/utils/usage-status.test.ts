import { describe, expect, it } from "vitest";

import { getUsageStatus } from "@/features/billing/utils/usage-status";

// USAGE_WARNING_RATIO is 0.8 - these cover the boundaries around it and
// around the limit itself, the two thresholds the Usage Indicator renders
// differently.
describe("getUsageStatus", () => {
  it("returns 'ok' well below the warning threshold", () => {
    expect(getUsageStatus(5, 15)).toBe("ok");
  });

  it("returns 'ok' just under the 80% warning threshold", () => {
    // 11/15 = 73.3%
    expect(getUsageStatus(11, 15)).toBe("ok");
  });

  it("returns 'approaching-limit' exactly at the 80% warning threshold", () => {
    expect(getUsageStatus(12, 15)).toBe("approaching-limit");
  });

  it("returns 'approaching-limit' between the warning threshold and the limit", () => {
    expect(getUsageStatus(14, 15)).toBe("approaching-limit");
  });

  it("returns 'at-limit' exactly at the limit", () => {
    expect(getUsageStatus(15, 15)).toBe("at-limit");
  });

  it("returns 'at-limit' if usage somehow exceeds the limit", () => {
    expect(getUsageStatus(16, 15)).toBe("at-limit");
  });

  it("returns 'at-limit' for a zero limit rather than dividing by zero", () => {
    expect(getUsageStatus(0, 0)).toBe("at-limit");
  });
});
