import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { AuthService } from "@/features/auth/services/auth.service";
import { NotificationFilterBar } from "@/features/notifications/components/NotificationFilterBar";
import { NotificationHeaderActions } from "@/features/notifications/components/NotificationHeaderActions";
import { NotificationsGate } from "@/features/notifications/components/NotificationsGate";
import { NotificationsList } from "@/features/notifications/components/NotificationsList";
import { notificationFiltersSchema } from "@/features/notifications/schemas/notification.schema";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { Badge } from "@/shared/components/ui/badge";

export const metadata: Metadata = { title: "Notifications" };

// IMPLEMENTATION_ORDER_V2.md Phase 36 (Notification Center & Smart
// Reminders). Pro-gated entirely through NotificationService.getNotifications
// (BillingService.requireProPlan); a FORBIDDEN result renders
// NotificationsGate, the same pattern Calendar/Goals/Advanced Analytics/
// Smart Job Import already established.
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const resolvedSearchParams = await searchParams;
  const filters = notificationFiltersSchema.parse(resolvedSearchParams);

  const [result, pickerOptions] = await Promise.all([
    NotificationService.getNotifications(user.id, user.created_at, filters),
    ApplicationPickerService.getOptions(user.id),
  ]);

  if (!result.success) {
    if (result.error.code === ERROR_CODES.FORBIDDEN) {
      return <NotificationsGate />;
    }
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const { groups, unreadCount } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 ? <Badge>{unreadCount} unread</Badge> : null}
        </div>
        <NotificationHeaderActions />
      </div>

      <NotificationFilterBar
        defaultValues={{
          query: filters.query ?? "",
          unreadOnly: filters.unreadOnly ?? false,
          category: filters.category ?? "",
          companyId: filters.companyId ?? "",
          dateFrom: filters.dateFrom ?? "",
          dateTo: filters.dateTo ?? "",
        }}
        companies={pickerOptions.companies}
      />

      <NotificationsList groups={groups} />
    </div>
  );
}
