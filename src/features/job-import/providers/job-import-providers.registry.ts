import { ManualJobImportProvider } from "@/features/job-import/providers/manual.provider";
import type { JobImportProvider } from "@/features/job-import/types/job-import.types";

// IMPLEMENTATION_ORDER_V2.md Phase 32: the single, ordered list
// JobImportService selects from - the whole point of the provider
// abstraction is that adding LinkedIn/InfoJobs/Indeed/Greenhouse/Lever/
// Workday/Ashby later means adding one entry here (ahead of
// ManualJobImportProvider, which must always stay last), never touching
// JobImportService, the Server Actions, or any UI component.
//
// Order matters: JobImportService tries providers in this order and uses
// the first whose `supports(url)` returns true. ManualJobImportProvider's
// `supports` always returns true, so it must remain the last entry - a
// universal fallback, not a competitor for any specific domain a future
// provider would claim more specifically.
export const JOB_IMPORT_PROVIDERS: JobImportProvider[] = [ManualJobImportProvider];
