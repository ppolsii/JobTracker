import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type NotificationStatus = Database["public"]["Enums"]["notification_status"];

const NOTIFICATION_STATE_COLUMNS =
  "id, user_id, notification_key, status, created_at, updated_at, deleted_at";

// Only this module may query notification_states (ADR-008). Notification
// *content* is never stored (see the migration's own header comment) - this
// table only ever holds a user's read/archived/deleted interaction with a
// given, deterministically-keyed notification.
export const NotificationRepository = {
  // Bug fix: this used to filter `.is("deleted_at", null)`, which excluded a
  // deleted notification's own state row from every future read. Since
  // notification *content* is always freshly regenerated from source data
  // (see notification-calculations.ts), the next page load would recreate
  // the exact same key with no matching state row to attach - defaulting
  // back to "unread" as if the deletion had never happened. Deleted rows
  // must stay queryable so mergeNotificationState can keep recognizing them
  // as deleted, exactly like archived rows already do.
  async listStatesForUser(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("notification_states")
      .select(NOTIFICATION_STATE_COLUMNS)
      .eq("user_id", userId);
  },

  // Idempotent by design (`unique(user_id, notification_key)`) - upserts
  // rather than insert-then-update, since a notification's state row may or
  // may not exist yet depending on whether the user has ever interacted
  // with it before.
  async upsertStatus(userId: string, notificationKey: string, status: NotificationStatus) {
    const supabase = await createClient();
    return supabase
      .from("notification_states")
      .upsert(
        { user_id: userId, notification_key: notificationKey, status, deleted_at: null },
        { onConflict: "user_id,notification_key" }
      )
      .select(NOTIFICATION_STATE_COLUMNS)
      .single();
  },

  // "Mark all as read" - one bulk upsert instead of one round trip per
  // notification.
  async upsertManyStatus(userId: string, notificationKeys: string[], status: NotificationStatus) {
    if (notificationKeys.length === 0) {
      return { data: [], error: null };
    }
    const supabase = await createClient();
    return supabase
      .from("notification_states")
      .upsert(
        notificationKeys.map((notificationKey) => ({
          user_id: userId,
          notification_key: notificationKey,
          status,
          deleted_at: null,
        })),
        { onConflict: "user_id,notification_key" }
      )
      .select(NOTIFICATION_STATE_COLUMNS);
  },

  // BUSINESS_RULES.md "Soft Deletes": "Delete notification"/"Delete all
  // read" set deleted_at; no hard DELETE (no delete grant/policy exists on
  // this table at all). `status` isn't set here, so an upsert against an
  // existing row falls back to the column's default ('unread') - harmless,
  // since mergeNotificationState always treats a set `deleted_at` as
  // "deleted" regardless of whatever `status` value the row carries.
  async softDelete(userId: string, notificationKey: string) {
    const supabase = await createClient();
    return supabase
      .from("notification_states")
      .upsert(
        {
          user_id: userId,
          notification_key: notificationKey,
          deleted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,notification_key" }
      )
      .select(NOTIFICATION_STATE_COLUMNS)
      .single();
  },

  async softDeleteMany(userId: string, notificationKeys: string[]) {
    if (notificationKeys.length === 0) {
      return { data: [], error: null };
    }
    const supabase = await createClient();
    const deletedAt = new Date().toISOString();
    return supabase
      .from("notification_states")
      .upsert(
        notificationKeys.map((notificationKey) => ({
          user_id: userId,
          notification_key: notificationKey,
          deleted_at: deletedAt,
        })),
        { onConflict: "user_id,notification_key" }
      )
      .select(NOTIFICATION_STATE_COLUMNS);
  },
};
