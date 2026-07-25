import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { AuthService } from "@/features/auth/services/auth.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { ExportMenu } from "@/features/export/components/ExportMenu";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { GlobalSearch } from "@/features/search/components/GlobalSearch";
import { MainLayout } from "@/shared/components/layout/MainLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  // Phase 31.5 (Pro Plan Foundation): the Pricing nav item's "Pro" upsell
  // badge is Free-plan-only. Defaults to hidden on any lookup failure -
  // never show an upsell badge when the plan genuinely can't be determined.
  const subscriptionResult = await BillingService.getSubscriptionForUser(
    user.id
  );
  const showProBadge =
    subscriptionResult.success && subscriptionResult.data?.plan !== "pro";

  // Phase 36 (Notification Center): the bell's unread badge - a Free user
  // (or any lookup failure) simply shows no badge, never an error; the bell
  // itself always renders (see NotificationBell's own note).
  const unreadCountResult = await NotificationService.getUnreadCount(
    user.id,
    user.created_at
  );
  const unreadCount = unreadCountResult.success ? unreadCountResult.data : 0;

  return (
    <MainLayout
      footer={<LogoutButton />}
      search={<GlobalSearch />}
      exportMenu={<ExportMenu />}
      notificationBell={<NotificationBell unreadCount={unreadCount} />}
      userMenu={<UserMenu email={user.email ?? ""} />}
      showProBadge={showProBadge}
    >
      {children}
    </MainLayout>
  );
}
