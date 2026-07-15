import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";

// Minimal auth guard only. The full shell (Sidebar, Top Navigation, Theme
// Toggle) is built in Phase 5 - not anticipated here.
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return <>{children}</>;
}
