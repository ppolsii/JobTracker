"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  archiveNotificationAction,
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/features/notifications/actions/notification.actions";
import { NotificationIcon } from "@/features/notifications/components/NotificationIcon";
import type { Notification } from "@/features/notifications/types/notification.types";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

// "NOTIFICATION CENTER": "Each notification contains: Icon, Title,
// Description, Timestamp, Read/Unread state, Optional action button."
export function NotificationCard({ notification }: { notification: Notification }) {
  const [isPending, startTransition] = useTransition();
  const isUnread = notification.status === "unread";

  function handleMarkRead() {
    startTransition(async () => {
      const result = await markNotificationReadAction({ key: notification.key });
      if (!result.success) toast.error(result.error.message);
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveNotificationAction({ key: notification.key });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Notification archived.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteNotificationAction({ key: notification.key });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Notification deleted.");
    });
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3",
        isUnread && "border-primary/30 bg-primary/5"
      )}
    >
      <NotificationIcon
        category={notification.category}
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
      />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{notification.title}</p>
          {isUnread ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : null}
        </div>
        <p className="text-sm text-muted-foreground">{notification.description}</p>
        <time className="text-xs text-muted-foreground" dateTime={notification.timestamp}>
          {notification.timestamp.slice(0, 10)}
        </time>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {notification.action ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={notification.action.href} />}
            >
              {notification.action.label}
            </Button>
          ) : null}
          {isUnread ? (
            <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleMarkRead}>
              Mark as read
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleArchive}>
            Archive
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
