import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUS_TRANSITIONS,
  needsApplicationDateForTransition,
} from "@/features/applications/constants/application.constants";

describe("APPLICATION_STATUS_TRANSITIONS", () => {
  it("matches BUSINESS_RULES.md's documented transition graph exactly", () => {
    expect(APPLICATION_STATUS_TRANSITIONS).toEqual({
      Wishlist: ["Applied"],
      Applied: ["Recruiter Contact", "Rejected"],
      "Recruiter Contact": ["HR Interview", "Rejected"],
      "HR Interview": ["Technical Interview", "Rejected"],
      "Technical Interview": ["Final Interview", "Rejected"],
      "Final Interview": ["Offer", "Rejected"],
      Offer: ["Accepted", "Rejected"],
      Accepted: [],
      Rejected: [],
    });
  });

  it("makes Accepted and Rejected terminal - no outgoing transitions", () => {
    expect(APPLICATION_STATUS_TRANSITIONS.Accepted).toEqual([]);
    expect(APPLICATION_STATUS_TRANSITIONS.Rejected).toEqual([]);
  });

  it("never allows skipping stages (e.g. Wishlist straight to Offer)", () => {
    expect(APPLICATION_STATUS_TRANSITIONS.Wishlist).not.toContain("Offer");
  });

  it("never allows moving backwards (e.g. Accepted back to Applied)", () => {
    expect(APPLICATION_STATUS_TRANSITIONS.Accepted).not.toContain("Applied");
  });
});

describe("needsApplicationDateForTransition", () => {
  it("requires a date only when leaving Wishlist without one already set", () => {
    expect(needsApplicationDateForTransition("Wishlist", null)).toBe(true);
  });

  it("does not require a date when leaving Wishlist if one is already set", () => {
    expect(needsApplicationDateForTransition("Wishlist", "2026-01-01")).toBe(
      false
    );
  });

  it("does not require a date for transitions that are not out of Wishlist", () => {
    expect(needsApplicationDateForTransition("Applied", null)).toBe(false);
    expect(needsApplicationDateForTransition("HR Interview", null)).toBe(false);
  });
});
