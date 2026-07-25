"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteAllReadNotificationsAction,
  markAllNotificationsReadAction,
} from "@/features/notifications/actions/notification.actions";
import { Button } from "@/shared/components/ui/button";

// "NOTIFICATION MANAGEMENT": "Mark all as read", "Delete all read."
export function NotificationHeaderActions() {
  const [isPending, startTransition] = useTransition();

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("All notifications marked as read.");
    });
  }

  function handleDeleteAllRead() {
    startTransition(async () => {
      const result = await deleteAllReadNotificationsAction();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Read notifications deleted.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleMarkAllRead}>
        Mark all as read
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleDeleteAllRead}>
        Delete all read
      </Button>
    </div>
  );
}
