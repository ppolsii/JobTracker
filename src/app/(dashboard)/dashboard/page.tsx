import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { AuthService } from "@/features/auth/services/auth.service";
import { DashboardKpiCards } from "@/features/dashboard/components/DashboardKpiCards";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentApplicationsTable } from "@/features/dashboard/components/RecentApplicationsTable";
import { DashboardService } from "@/features/dashboard/services/dashboard.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

// IMPLEMENTATION_ORDER.md Phase 11: KPI cards, Recent applications, Quick
// actions, Dashboard layout. Charts/Insights (UI_SYSTEM.md's fuller
// "Dashboard Page" list) are Phase 12 (Analytics) - see CHANGELOG
// "Deviations". This page composes DashboardService (the aggregation
// layer) plus ApplicationPickerService directly, mirroring exactly how the
// Applications list page already composes multiple Services itself.
export default async function DashboardPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const [summaryResult, { companies, cvVersions }] = await Promise.all([
    DashboardService.getSummary(user.id),
    ApplicationPickerService.getOptions(user.id),
  ]);

  if (!summaryResult.success) {
    return (
      <p className="text-sm text-destructive">{summaryResult.error.message}</p>
    );
  }

  const { counts, recentApplications } = summaryResult.data;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <DashboardKpiCards counts={counts} />

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickActions companies={companies} cvVersions={cvVersions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentApplicationsTable applications={recentApplications} />
        </CardContent>
      </Card>
    </div>
  );
}
