import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationStatusService } from "@/features/applications/services/application-status.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import { buildApplicationsCsv } from "@/features/export/utils/export-csv";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER.md Phase 14: "CSV Export. JSON Export." This Service
// introduces no repository and no business rule of its own - it reuses the
// existing per-entity Services exactly as AnalyticsService (Phase 12) and
// SearchService (Phase 13) already reuse them, and performs only the one
// export-specific transformation each format requires (JSON structuring,
// CSV row-building - delegated to a pure utility, not inlined here).
//
// Post-MVP technical debt resolution (KNOWN_ISSUES.md "Phase 14 - Export"):
// both methods below were rewritten to use each entity's
// `listAllIncludingArchived` instead of its paginated `list` - "export all
// your information" (BUSINESS_RULES.md) means archived rows too, since
// soft-delete never actually erases data. This also removed the need for
// `EXPORT_ALL_LIMIT` (a workaround for `list` always requiring a page size),
// since the new methods are genuinely unbounded.
export const ExportService = {
  // FEATURES.md Feature 12: "Export contains every user-owned entity." JSON
  // naturally holds multiple, differently-shaped entities in one structure,
  // so this is the full account bundle: every company, CV version,
  // application (with its Company/CV Version names already joined, same as
  // the Applications list page), status history entry, and note the user
  // owns - including anything archived.
  async exportJSON(userId: string): Promise<ActionResult<string>> {
    // BUSINESS_RULES.md "Billing": Export requires Pro. BillingService owns
    // this decision entirely - this Service never inspects plan itself.
    const plan = await BillingService.requireProPlan(userId);
    if (!plan.success) return plan;

    const [companiesResult, cvVersionsResult, applicationsResult, notesResult] =
      await Promise.all([
        CompanyService.listAllIncludingArchived(userId),
        CVVersionService.listAllIncludingArchived(userId),
        ApplicationService.listAllIncludingArchived(userId),
        ApplicationNoteService.listAllForUser(userId),
      ]);

    if (!companiesResult.success) return companiesResult;
    if (!cvVersionsResult.success) return cvVersionsResult;
    if (!applicationsResult.success) return applicationsResult;
    if (!notesResult.success) return notesResult;

    // `application_status_history` ("the source of truth", DATABASE.md) has
    // no export of its own yet - reuses the exact bulk-by-ID-list method
    // AnalyticsService already relies on, passing every application id
    // (including archived applications', unlike Analytics' own call) so
    // history for archived applications is included too.
    const applicationIds = applicationsResult.data.map(
      (application) => application.id
    );
    const statusHistoryResult =
      await ApplicationStatusService.listHistoryForApplications(applicationIds);
    if (!statusHistoryResult.success) return statusHistoryResult;

    const payload = {
      companies: companiesResult.data,
      cvVersions: cvVersionsResult.data,
      applications: applicationsResult.data,
      statusHistory: statusHistoryResult.data,
      notes: notesResult.data,
    };

    return { success: true, data: JSON.stringify(payload, null, 2) };
  },

  // CSV is a single flat table, so this covers Applications - see
  // buildApplicationsCsv's own comment for why that entity was chosen.
  // `API.md`/`BUSINESS_RULES.md` have been corrected to describe this scope
  // explicitly, rather than implying CSV mirrors JSON's full account bundle.
  async exportCSV(userId: string): Promise<ActionResult<string>> {
    const plan = await BillingService.requireProPlan(userId);
    if (!plan.success) return plan;

    const applicationsResult =
      await ApplicationService.listAllIncludingArchived(userId);

    if (!applicationsResult.success) return applicationsResult;

    return {
      success: true,
      data: buildApplicationsCsv(applicationsResult.data),
    };
  },
};
