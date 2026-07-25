import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { BillingService } from "@/features/billing/services/billing.service";
import { CheckoutReturnNotice } from "@/features/billing/components/CheckoutReturnNotice";
import { SubscriptionSection } from "@/features/billing/components/SubscriptionSection";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { ProfileForm } from "@/features/settings/components/ProfileForm";
import { UserService } from "@/features/users/services/user.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export const metadata: Metadata = { title: "Settings" };

// IMPLEMENTATION_ORDER.md Phase 15: "Profile. Theme. Account." This page
// only composes UserService (Profile) and the already-complete Auth/Theme
// features - it defines no business rule and no repository of its own,
// matching the Dashboard (Phase 11) precedent exactly.
// Phase 31.5 (Pro Plan Foundation): added a "Subscription" section, composing
// BillingService the same way - no new business rule here either.
export default async function SettingsPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const [profileResult, subscriptionResult, usageResult] = await Promise.all([
    UserService.getProfile(user.id),
    BillingService.getSubscriptionForUser(user.id),
    BillingService.getApplicationUsage(user.id),
  ]);

  if (!profileResult.success) {
    return (
      <p className="text-sm text-destructive">{profileResult.error.message}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutReturnNotice />
      <h2 className="text-lg font-semibold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={profileResult.data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionResult.success ? (
            <SubscriptionSection
              subscription={subscriptionResult.data}
              usage={usageResult.success ? usageResult.data : null}
            />
          ) : (
            <p className="text-sm text-destructive">
              {subscriptionResult.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Switch between light and dark mode.
            </p>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
