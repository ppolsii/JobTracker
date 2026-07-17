import type { Metadata } from "next";

import { AuthService } from "@/features/auth/services/auth.service";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder proving the protected-route + session + shell flow works.
// The real dashboard (KPIs, charts, recent applications) is Phase 11.
// Logout is now available via the Sidebar and the TopNav's UserMenu (Phase 5).
export default async function DashboardPage() {
  const user = await AuthService.getCurrentUser();

  return (
    <p className="text-sm text-muted-foreground">Logged in as {user?.email}</p>
  );
}
