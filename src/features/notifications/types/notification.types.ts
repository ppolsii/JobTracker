import type { Database } from "@/types/supabase";

export type NotificationStateRecord =
  Database["public"]["Tables"]["notification_states"]["Row"];
export type NotificationStatus =
  Database["public"]["Enums"]["notification_status"];

// "Architecture must support future notification categories": a plain
// string union, not a database enum - adding a category later (or a new
// `type` within an existing one) needs no migration, since nothing about a
// notification's content is ever stored (see the migration's own header
// comment) - only `NotificationStatus` (read/unread/archived state) is.
export type NotificationCategory =
  | "application"
  | "interview"
  | "goal"
  | "achievement"
  | "calendar"
  | "general";

export interface NotificationAction {
  label: string;
  href: string;
}

// The single, unified shape every generator (one per category, see
// notification-calculations.ts) produces - `key` is a deterministic string
// derived entirely from the underlying condition (never a random id), so
// regenerating the list on every read always reattaches the same
// read/archived/deleted state to the same logical notification.
export interface Notification {
  key: string;
  category: NotificationCategory;
  type: string;
  title: string;
  description: string;
  // ISO date or datetime - always a real, existing timestamp from the
  // underlying data ("never fabricate recommendations") - a status change
  // date, an event date, an achievement's unlocked_at, or "today" only for
  // the general/welcome notification, which has no other anchor.
  timestamp: string;
  status: NotificationStatus;
  action?: NotificationAction;
  applicationId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
}

export type NotificationGroupKey = "today" | "yesterday" | "this_week" | "older";

export interface GroupedNotifications {
  key: NotificationGroupKey;
  label: string;
  notifications: Notification[];
}

// "SEARCH": every field optional and combinable, mirroring
// CalendarFilters/AdvancedAnalyticsFilters' own shape.
export interface NotificationFilters {
  unreadOnly?: boolean;
  category?: NotificationCategory;
  applicationId?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
}

export interface NotificationsPageData {
  groups: GroupedNotifications[];
  unreadCount: number;
  totalCount: number;
}
