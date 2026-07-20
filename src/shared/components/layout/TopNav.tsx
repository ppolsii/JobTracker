"use client";

import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/config/navigation";
import { MobileSidebar } from "@/shared/components/layout/MobileSidebar";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

// `search` and `exportMenu` are slots the caller fills in, the same
// prop-injection pattern already used for `footer`/`userMenu` - this keeps
// shared/ feature-agnostic (ARCHITECTURE.md) instead of importing
// @/features/search or @/features/export directly.
export function TopNav({
  footer,
  search,
  exportMenu,
  userMenu,
}: {
  footer?: React.ReactNode;
  search: React.ReactNode;
  exportMenu: React.ReactNode;
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
      <div className="ml-auto hidden max-w-xs flex-1 sm:block">{search}</div>
      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        {exportMenu}
        <ThemeToggle />
        {userMenu}
      </div>
    </header>
  );
}
