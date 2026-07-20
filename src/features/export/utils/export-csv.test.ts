import { describe, expect, it } from "vitest";

import { buildApplicationsCsv } from "@/features/export/utils/export-csv";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";

function application(
  overrides: Partial<ApplicationWithRelations> & { id: string }
): ApplicationWithRelations {
  return {
    user_id: "user-1",
    company_id: "company-1",
    cv_version_id: "cv-1",
    position: "Backend Engineer",
    job_url: null,
    location: null,
    work_mode: null,
    employment_type: null,
    source: null,
    salary_min: null,
    salary_max: null,
    currency: "EUR",
    application_date: "2026-01-01",
    current_status: "Applied",
    response_date: null,
    offer_salary: null,
    rejection_reason: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    companies: { name: "Acme" },
    cv_versions: { name: "Backend CV" },
    ...overrides,
  };
}

describe("buildApplicationsCsv", () => {
  it("returns just the header row when there are no applications", () => {
    const csv = buildApplicationsCsv([]);

    expect(csv).toBe(
      "Position,Company,CV Version,Status,Application Date,Response Date,Source,Work Mode,Employment Type,Location,Job URL,Salary Min,Salary Max,Currency,Offer Salary,Rejection Reason,Created At,Updated At"
    );
  });

  it("renders every stored field faithfully, without relabelling values", () => {
    const csv = buildApplicationsCsv([
      application({
        id: "a1",
        position: "Backend Engineer",
        current_status: "HR Interview",
        salary_min: 50000,
        salary_max: 60000,
      }),
    ]);
    const [, row] = csv.split("\n");

    expect(row).toBe(
      "Backend Engineer,Acme,Backend CV,HR Interview,2026-01-01,,,,,,,50000,60000,EUR,,,2026-01-01T00:00:00.000Z,2026-01-01T00:00:00.000Z"
    );
  });

  it("renders null fields as empty, not as a placeholder string", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", location: null }),
    ]);
    const [, row] = csv.split("\n");

    // Location is the 10th column - empty between its surrounding commas.
    expect(row.split(",")[9]).toBe("");
  });

  it("quotes a field containing a comma and does not corrupt the column count", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", companies: { name: "Acme, Inc." } }),
    ]);
    const [, row] = csv.split("\n");

    expect(row).toContain('"Acme, Inc."');
  });

  it("doubles internal quotes when a field contains a quote character", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", position: 'The "Best" Job' }),
    ]);
    const [, row] = csv.split("\n");

    expect(row).toContain('"The ""Best"" Job"');
  });

  it("quotes a field containing a newline", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", rejection_reason: "Line one\nLine two" }),
    ]);

    expect(csv).toContain('"Line one\nLine two"');
  });

  it("does not quote a plain field with no special characters", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", position: "Backend Engineer" }),
    ]);
    const [, row] = csv.split("\n");

    expect(row.startsWith("Backend Engineer,")).toBe(true);
  });

  it("emits one row per application, in the order given", () => {
    const csv = buildApplicationsCsv([
      application({ id: "a1", position: "First" }),
      application({ id: "a2", position: "Second" }),
    ]);
    const rows = csv.split("\n").slice(1);

    expect(rows).toHaveLength(2);
    expect(rows[0].startsWith("First,")).toBe(true);
    expect(rows[1].startsWith("Second,")).toBe(true);
  });
});
