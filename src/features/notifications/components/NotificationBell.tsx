import Link from "next/link";
import { Bell } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { Button } from "@/shared/components/ui/button";

// "Add a bell icon to the navigation. Display unread count." Always visible
// regardless of plan (mirrors Calendar/Goals' own nav items) - a Free user
// clicking through simply lands on /notifications' own NotificationsGate,
// the same "attempt the action, react to FORBIDDEN" pattern every other
// Pro-only page already uses, rather than hiding the bell or duplicating a
// client-side plan check here.
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      nativeButton={false}
      render={<Link href={ROUTES.NOTIFICATIONS} aria-label="Notifications" />}
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
