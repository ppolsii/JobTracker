import type { JobImportProvider } from "@/features/job-import/types/job-import.types";

// IMPLEMENTATION_ORDER_V2.md Phase 32: "The Manual Provider should simulate
// extraction by allowing manual entry after URL validation." It never
// scrapes or calls any external service - `extract` returns an otherwise-
// empty ExtractedJobData (only `job_url` populated), so the review form
// simply starts blank and the user fills in every field themselves. This is
// also the universal fallback: `supports` always returns true, so it always
// matches once no more specific provider (added in a future phase) claims
// the URL first - see the provider registry for why order matters.
export const ManualJobImportProvider: JobImportProvider = {
  name: "manual",

  supports(): boolean {
    return true;
  },

  async extract(url: string) {
    return {
      company: null,
      position: null,
      location: null,
      work_mode: null,
      employment_type: null,
      salary_min: null,
      salary_max: null,
      currency: null,
      job_url: url,
      description: null,
    };
  },
};
