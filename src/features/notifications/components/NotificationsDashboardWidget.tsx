"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ROUTES } from "@/config/routes";
import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { markAllNotificationsReadAction } from "@/features/notifications/actions/notification.actions";
import { NotificationIcon } from "@/features/notifications/components/NotificationIcon";
import type { NotificationsPageData } from "@/features/notifications/types/notification.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { ActionResult } from "@/types/action-result";

const DASHBOARD_PREVIEW_COUNT = 5;

// "DASHBOARD": "Latest notifications, Unread count, Quick actions." Reuses
// the exact same NotificationService.getNotifications call the /notifications
// page itself uses - never a second calculation. A FORBIDDEN result renders
// a teaser instead of the full NotificationsGate - "attempt the action,
// react to FORBIDDEN," the same pattern GoalsDashboardWidget already
// established for a passive dashboard surface.
export function NotificationsDashboardWidget({
  result,
}: {
  result: ActionResult<NotificationsPageData>;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!result.success) {
    if (result.error.code !== ERROR_CODES.FORBIDDEN) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Get smart reminders about applications, interviews, goals, and more with Pro.
          </p>
          <Button size="sm" className="w-fit" onClick={() => setUpgradeOpen(true)}>
            Upgrade
          </Button>
        </CardContent>
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureName="Notifications" />
      </Card>
    );
  }

  const { groups, unreadCount } = result.data;
  const latest = groups.flatMap((group) => group.notifications).slice(0, DASHBOARD_PREVIEW_COUNT);

  function handleMarkAllRead() {
    startTransition(async () => {
      const actionResult = await markAllNotificationsReadAction();
      if (!actionResult.success) {
        toast.error(actionResult.error.message);
        return;
      }
      toast.success("All notifications marked as read.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Notifications</CardTitle>
          {unreadCount > 0 ? <Badge>{unreadCount} unread</Badge> : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={ROUTES.NOTIFICATIONS} />}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {latest.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {latest.map((notification) => (
              <li key={notification.key} className="flex items-start gap-2 text-sm">
                <NotificationIcon
                  category={notification.category}
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="flex flex-col">
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-muted-foreground">{notification.description}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            disabled={isPending}
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
