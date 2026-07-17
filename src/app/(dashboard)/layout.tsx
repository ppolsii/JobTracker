import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { AuthService } from "@/features/auth/services/auth.service";
import { MainLayout } from "@/shared/components/layout/MainLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <MainLayout
      footer={<LogoutButton />}
      userMenu={<UserMenu email={user.email ?? ""} />}
    >
      {children}
    </MainLayout>
  );
}
