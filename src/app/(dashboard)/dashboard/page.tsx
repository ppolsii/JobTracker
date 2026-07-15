import type { Metadata } from "next";

import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { AuthService } from "@/features/auth/services/auth.service";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder proving the protected-route + session + logout flow works.
// The real dashboard (KPIs, charts, recent applications) is Phase 11.
export default async function DashboardPage() {
  const user = await AuthService.getCurrentUser();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-muted-foreground">
        Logged in as {user?.email}
      </p>
      <LogoutButton />
    </main>
  );
}
