import type { ApplicationWithRelations } from "@/features/applications/types/application.types";

// RFC 4180: a field is quoted, with internal quotes doubled, only when it
// contains the delimiter, a quote, or a newline - plain fields stay
// unquoted so the file reads cleanly in any spreadsheet tool.
function csvField(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const APPLICATION_CSV_HEADERS = [
  "Position",
  "Company",
  "CV Version",
  "Status",
  "Application Date",
  "Response Date",
  "Source",
  "Work Mode",
  "Employment Type",
  "Location",
  "Job URL",
  "Salary Min",
  "Salary Max",
  "Currency",
  "Offer Salary",
  "Rejection Reason",
  "Created At",
  "Updated At",
];

// BUSINESS_RULES.md "Export": CSV is a single flat table, so this covers
// Applications - the entity every other user-owned record (Company, CV
// Version, Note) exists to describe - denormalized with the Company/CV
// Version names already joined onto it. Every column is the application's
// own stored value, unrelabelled and unrounded: "exported data must
// faithfully represent the user's existing data."
export function buildApplicationsCsv(
  applications: ApplicationWithRelations[]
): string {
  const rows = applications.map((application) =>
    [
      application.position,
      application.companies?.name ?? null,
      application.cv_versions?.name ?? null,
      application.current_status,
      application.application_date,
      application.response_date,
      application.source,
      application.work_mode,
      application.employment_type,
      application.location,
      application.job_url,
      application.salary_min,
      application.salary_max,
      application.currency,
      application.offer_salary,
      application.rejection_reason,
      application.created_at,
      application.updated_at,
    ]
      .map(csvField)
      .join(",")
  );

  return [APPLICATION_CSV_HEADERS.join(","), ...rows].join("\n");
}
