import { BellOff } from "lucide-react";

import { NotificationCard } from "@/features/notifications/components/NotificationCard";
import type { GroupedNotifications } from "@/features/notifications/types/notification.types";
import { EmptyState } from "@/shared/components/EmptyState";

// "Display notifications grouped by: Today, Yesterday, This Week, Older."
// `groups` already omits any empty group (groupNotificationsByRecency) -
// this component only renders what's there.
export function NotificationsList({ groups }: { groups: GroupedNotifications[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="No notifications."
        description="You're all caught up."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
          <div className="flex flex-col gap-2">
            {group.notifications.map((notification) => (
              <NotificationCard key={notification.key} notification={notification} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
