import { z } from "zod";

import { NOTIFICATION_CATEGORY_OPTIONS } from "@/features/notifications/constants/notification.constants";

// "SEARCH": sanitizes the Notifications page's searchParams, falling back
// to "no filter" instead of erroring - the same convention
// calendarFiltersSchema/advancedAnalyticsFiltersSchema already use.
export const notificationFiltersSchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === "true")
    .catch(false),
  category: z.enum(NOTIFICATION_CATEGORY_OPTIONS).optional().catch(undefined),
  applicationId: z.string().uuid().optional().catch(undefined),
  companyId: z.string().uuid().optional().catch(undefined),
  dateFrom: z.string().trim().max(10).optional().catch(undefined),
  dateTo: z.string().trim().max(10).optional().catch(undefined),
  query: z.string().trim().max(255).optional().catch(undefined),
});
export type NotificationFiltersInput = z.infer<typeof notificationFiltersSchema>;

// A notification's `key` is a deterministic string (never a uuid) - see
// notification-calculations.ts.
export const notificationKeySchema = z.object({
  key: z.string().trim().min(1),
});
export type NotificationKeyInput = z.infer<typeof notificationKeySchema>;
