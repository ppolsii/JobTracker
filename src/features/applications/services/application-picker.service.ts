import { CompanyService } from "@/features/companies/services/company.service";
import { CVVersionService } from "@/features/cv/services/cv-version.service";

// API.md "Pagination": limit max 100 - the same bound the Applications
// list/filter pickers have always used, now defined once here instead of
// the three separate copies KNOWN_ISSUES.md flagged (applications/page.tsx,
// applications/[id]/page.tsx, dashboard/page.tsx).
const PICKER_OPTION_LIMIT = 100;

export interface PickerOption {
  id: string;
  name: string;
}

// Phase 16 (Optimisation) "Remove duplicated code": those three pages each
// independently fetched and mapped the same Company/CV Version option
// lists for their pickers - identical query, identical mapping, identical
// "default to [] on failure" fallback, in three places (KNOWN_ISSUES.md
// "Phase 11"). Sibling to ApplicationStatsService/ApplicationStatusService/
// ApplicationNoteService (same one-file-per-sub-concern pattern already
// established in this feature) - "supplying picker options for application
// forms" is its own sub-concern, not owned by Companies or CV Versions
// themselves. Preserves the exact prior behaviour: a failed lookup
// degrades silently to an empty list rather than failing the page.
export const ApplicationPickerService = {
  async getOptions(
    userId: string
  ): Promise<{ companies: PickerOption[]; cvVersions: PickerOption[] }> {
    const [companiesResult, cvVersionsResult] = await Promise.all([
      CompanyService.list(userId, { page: 1, limit: PICKER_OPTION_LIMIT }),
      CVVersionService.list(userId, { page: 1, limit: PICKER_OPTION_LIMIT }),
    ]);

    return {
      companies: companiesResult.success
        ? companiesResult.data.companies.map((c) => ({
            id: c.id,
            name: c.name,
          }))
        : [],
      cvVersions: cvVersionsResult.success
        ? cvVersionsResult.data.cvVersions.map((cv) => ({
            id: cv.id,
            name: cv.name,
          }))
        : [],
    };
  },
};
