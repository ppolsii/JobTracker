import { ApplicationNoteService } from "@/features/applications/services/application-note.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { CompanyService } from "@/features/companies/services/company.service";
import { SEARCH_RESULT_LIMIT } from "@/features/search/constants/search.constants";
import type { SearchResults } from "@/features/search/types/search.types";
import type { ActionResult } from "@/types/action-result";

// IMPLEMENTATION_ORDER.md Phase 13: "Search applications. Search companies.
// Search notes." This Service introduces no repository and no business rule
// of its own - it is a pure aggregation layer over three already-complete
// features' own Services, exactly matching the precedent AnalyticsService
// (Phase 12) and DashboardService (Phase 11) already set: reuse existing
// Services, never reach past them into a Repository.
export const SearchService = {
  async search(
    userId: string,
    query: string
  ): Promise<ActionResult<SearchResults>> {
    // BUSINESS_RULES.md "Search" defines matching behaviour, not a minimum
    // query length - this guard is a performance/necessity check only ("no
    // query text means nothing to match"), not an invented business rule.
    // Avoids three queries whose result would always be empty anyway.
    if (query.length === 0) {
      return {
        success: true,
        data: { companies: [], applications: [], notes: [] },
      };
    }

    const [companiesResult, applicationsResult, notesResult] =
      await Promise.all([
        CompanyService.list(userId, {
          query,
          page: 1,
          limit: SEARCH_RESULT_LIMIT,
        }),
        ApplicationService.list(userId, {
          query,
          sort_by: "updated_at",
          sort_dir: "desc",
          page: 1,
          limit: SEARCH_RESULT_LIMIT,
        }),
        ApplicationNoteService.search(userId, query, SEARCH_RESULT_LIMIT),
      ]);

    if (!companiesResult.success) return companiesResult;
    if (!applicationsResult.success) return applicationsResult;
    if (!notesResult.success) return notesResult;

    return {
      success: true,
      data: {
        companies: companiesResult.data.companies.map((company) => ({
          id: company.id,
          name: company.name,
        })),
        applications: applicationsResult.data.applications.map((app) => ({
          id: app.id,
          position: app.position,
          companyName: app.companies?.name ?? null,
        })),
        notes: notesResult.data.map((note) => ({
          id: note.id,
          applicationId: note.application_id,
          content: note.content,
          applicationPosition: note.applications?.position ?? null,
        })),
      },
    };
  },
};
