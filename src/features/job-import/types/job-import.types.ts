import type {
  EmploymentType,
  WorkMode,
} from "@/features/applications/types/application.types";

// IMPLEMENTATION_ORDER_V2.md Phase 32 (Smart Job Import). Every field a
// provider *might* be able to read off a job posting page - deliberately a
// superset of what any one provider will realistically extract. Every field
// is nullable: a provider that can only read the job title still returns a
// valid ExtractedJobData, just with everything else null. Nothing here maps
// 1:1 to the `applications` table - `company` is a free-text name (the
// application still needs an existing `company_id`; see
// CompanyService.findOrCreateByName), and `description` has no column on
// `applications` at all (it becomes the application's first Note - see
// JobImportService.confirmImport).
export interface ExtractedJobData {
  company: string | null;
  position: string | null;
  location: string | null;
  work_mode: WorkMode | null;
  employment_type: EmploymentType | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  job_url: string;
  description: string | null;
}

// The provider abstraction Phase 32 exists to establish. Every current and
// future provider (LinkedIn, InfoJobs, Indeed, Greenhouse, Lever, Workday,
// Ashby, ...) implements exactly this interface - JobImportService and every
// UI component depend only on this shape, never on a concrete provider.
export interface JobImportProvider {
  // A short, stable identifier (e.g. "manual", "linkedin") - shown to the
  // user as "detected provider" and used only for that, never branched on
  // outside this feature.
  readonly name: string;
  // Whether this provider can handle the given URL. JobImportService tries
  // providers in registration order and uses the first match.
  supports(url: string): boolean;
  // Performs the actual extraction. May throw - JobImportService is
  // responsible for catching and translating that into a friendly
  // ActionResult error; a provider is never trusted to produce its own
  // user-facing error message.
  extract(url: string): Promise<ExtractedJobData>;
}
