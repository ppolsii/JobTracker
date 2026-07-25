import { z } from "zod";

import {
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";

// IMPLEMENTATION_ORDER_V2.md Phase 33 (Advanced Analytics) "FILTERS".
// Sanitizes the Advanced Analytics page's searchParams (untrusted input per
// CODE_STYLE.md "Security") - falls back to "no filter" instead of erroring,
// the same convention listApplicationsSchema already uses for the
// Applications list page, since a malformed filter in the URL shouldn't
// break a read.
export const advancedAnalyticsFiltersSchema = z.object({
  dateFrom: z.string().trim().max(10).optional().catch(undefined),
  dateTo: z.string().trim().max(10).optional().catch(undefined),
  companyId: z.string().uuid().optional().catch(undefined),
  cvVersionId: z.string().uuid().optional().catch(undefined),
  workMode: z.enum(WORK_MODE_OPTIONS).optional().catch(undefined),
  employmentType: z.enum(EMPLOYMENT_TYPE_OPTIONS).optional().catch(undefined),
  status: z.enum(APPLICATION_STATUS_OPTIONS).optional().catch(undefined),
});
export type AdvancedAnalyticsFiltersInput = z.infer<
  typeof advancedAnalyticsFiltersSchema
>;
