import { z } from "zod";

import {
  APPLICATION_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import { CALENDAR_EVENT_TYPE_OPTIONS } from "@/features/calendar/constants/calendar.constants";

// "CALENDAR FILTERS". Sanitizes the Calendar page's searchParams, falling
// back to "no filter" instead of erroring - the same convention
// listApplicationsSchema/advancedAnalyticsFiltersSchema already use.
export const calendarFiltersSchema = z.object({
  companyId: z.string().uuid().optional().catch(undefined),
  eventType: z.enum(CALENDAR_EVENT_TYPE_OPTIONS).optional().catch(undefined),
  applicationStatus: z
    .enum(APPLICATION_STATUS_OPTIONS)
    .optional()
    .catch(undefined),
  dateFrom: z.string().trim().max(10).optional().catch(undefined),
  dateTo: z.string().trim().max(10).optional().catch(undefined),
  workMode: z.enum(WORK_MODE_OPTIONS).optional().catch(undefined),
  employmentType: z.enum(EMPLOYMENT_TYPE_OPTIONS).optional().catch(undefined),
  query: z.string().trim().max(255).optional().catch(undefined),
});
export type CalendarFiltersInput = z.infer<typeof calendarFiltersSchema>;

// "CREATE CUSTOM EVENT". Fields: Title, Description, Date, Optional
// Application - `type` (Reminder/Custom Event) additionally distinguishes
// which of the two user-created "EVENT TYPES" this is, per that section's
// own list.
const customEventFields = {
  type: z.enum(["reminder", "custom"]),
  title: z.string().trim().min(1, "Title is required.").max(255),
  description: z.string().trim().max(10000, "Description is too long.").optional(),
  eventDate: z.string().trim().min(1, "Date is required."),
  applicationId: z.string().uuid().optional(),
};

export const createCalendarEventSchema = z.object(customEventFields);
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z.object({
  id: z.string().uuid(),
  ...customEventFields,
});
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const archiveCalendarEventSchema = z.object({
  id: z.string().uuid(),
});
export type ArchiveCalendarEventInput = z.infer<
  typeof archiveCalendarEventSchema
>;
