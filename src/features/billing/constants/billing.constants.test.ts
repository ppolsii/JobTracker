import { describe, expect, it } from "vitest";

import {
  FREE_PLAN_APPLICATION_LIMIT,
  PLAN_FEATURE_ROWS,
  PRO_BENEFITS,
} from "@/features/billing/constants/billing.constants";

// Phase 31.5 (Pro Plan Foundation). PLAN_FEATURE_ROWS is the single source
// of truth for the Pricing page's plan cards and comparison table - these
// guard the data itself, not any rendered output (this test suite has no
// component-rendering setup - see vitest.config.ts).
describe("PLAN_FEATURE_ROWS", () => {
  it("states the application limit row using the current FREE_PLAN_APPLICATION_LIMIT constant, not a hardcoded number", () => {
    const applicationsRow = PLAN_FEATURE_ROWS.find(
      (row) => row.label === "Active applications"
    );

    expect(applicationsRow).toBeDefined();
    expect(applicationsRow?.free).toBe(`Up to ${FREE_PLAN_APPLICATION_LIMIT}`);
    expect(applicationsRow?.pro).toBe("Unlimited");
  });

  // Every "coming soon" row shipped over Phases 32-36 - there may be zero
  // remaining at any given point (this codebase's own roadmap can run
  // ahead of new placeholders), so this only guards the *shape* of any
  // that do exist, rather than asserting one must currently exist.
  it("marks every 'coming soon' row as Pro-only", () => {
    const comingSoonRows = PLAN_FEATURE_ROWS.filter((row) => row.comingSoon);

    for (const row of comingSoonRows) {
      expect(row.pro).toBe(true);
      expect(row.free).toBe(false);
    }
  });

  it("gives every row a non-empty label", () => {
    for (const row of PLAN_FEATURE_ROWS) {
      expect(row.label.length).toBeGreaterThan(0);
    }
  });

  // Phase 32 (Smart Job Import): implemented via the Manual Provider, so it
  // must no longer be marked "Coming Soon" on the Pricing page.
  it("marks Smart Job Import as a real, available Pro feature (not coming soon)", () => {
    const row = PLAN_FEATURE_ROWS.find(
      (candidate) => candidate.label === "Smart Job Import"
    );

    expect(row).toBeDefined();
    expect(row?.pro).toBe(true);
    expect(row?.comingSoon).toBeFalsy();
  });

  // Phase 33 (Advanced Analytics): implemented, so it must no longer be
  // marked "Coming Soon" on the Pricing page either.
  it("marks Advanced Analytics as a real, available Pro feature (not coming soon)", () => {
    const row = PLAN_FEATURE_ROWS.find(
      (candidate) => candidate.label === "Advanced Analytics"
    );

    expect(row).toBeDefined();
    expect(row?.pro).toBe(true);
    expect(row?.comingSoon).toBeFalsy();
  });

  // Phase 34 (Calendar & Timeline): implemented, so it must no longer be
  // marked "Coming Soon".
  it("marks Calendar as a real, available Pro feature (not coming soon)", () => {
    const calendarRow = PLAN_FEATURE_ROWS.find(
      (candidate) => candidate.label === "Calendar"
    );

    expect(calendarRow).toBeDefined();
    expect(calendarRow?.pro).toBe(true);
    expect(calendarRow?.comingSoon).toBeFalsy();
  });

  // Phase 35 (Goals, Achievements & Progress): implemented, so it must no
  // longer be marked "Coming Soon" either.
  it("marks Goals as a real, available Pro feature (not coming soon)", () => {
    const row = PLAN_FEATURE_ROWS.find((candidate) => candidate.label === "Goals");

    expect(row).toBeDefined();
    expect(row?.pro).toBe(true);
    expect(row?.comingSoon).toBeFalsy();
  });

  // Phase 36 (Notification Center & Smart Reminders): "Reminders" always
  // meant proactive notification delivery, which this phase actually
  // builds - no longer "Coming Soon." "Notification Center" is a new row
  // naming the feature itself.
  it("marks Reminders and Notification Center as real, available Pro features (not coming soon)", () => {
    const remindersRow = PLAN_FEATURE_ROWS.find(
      (candidate) => candidate.label === "Reminders"
    );
    const notificationCenterRow = PLAN_FEATURE_ROWS.find(
      (candidate) => candidate.label === "Notification Center"
    );

    expect(remindersRow).toBeDefined();
    expect(remindersRow?.pro).toBe(true);
    expect(remindersRow?.comingSoon).toBeFalsy();

    expect(notificationCenterRow).toBeDefined();
    expect(notificationCenterRow?.pro).toBe(true);
    expect(notificationCenterRow?.comingSoon).toBeFalsy();
  });
});

describe("PRO_BENEFITS", () => {
  it("is non-empty, since every upgrade surface renders it", () => {
    expect(PRO_BENEFITS.length).toBeGreaterThan(0);
  });
});
