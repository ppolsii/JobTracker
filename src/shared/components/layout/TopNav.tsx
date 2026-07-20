"use client";

import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/config/navigation";
import { ExportMenu } from "@/features/export/components/ExportMenu";
import { GlobalSearch } from "@/features/search/components/GlobalSearch";
import { MobileSidebar } from "@/shared/components/layout/MobileSidebar";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export function TopNav({
  footer,
  userMenu,
}: {
  footer?: React.ReactNode;
  userMenu: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentPage = NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
      <MobileSidebar footer={footer} />
      <h1 className="text-sm font-semibold">
        {currentPage?.label ?? "JobTracker Insights"}
      </h1>
      <div className="ml-auto hidden max-w-xs flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <ExportMenu />
        <ThemeToggle />
        {userMenu}
      </div>
    </header>
  );
}
