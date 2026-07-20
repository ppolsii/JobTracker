import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";

// "/" is a pure authentication entry point (no marketing Landing Page yet -
// see UI_SYSTEM.md "Landing Page", future work). Mirrors the exact
// getCurrentUser()-then-redirect pattern already used by
// (auth)/layout.tsx and (dashboard)/layout.tsx.
export default async function Home() {
  const user = await AuthService.getCurrentUser();

  if (user) {
    redirect(ROUTES.DASHBOARD);
  }

  redirect(ROUTES.LOGIN);
}
