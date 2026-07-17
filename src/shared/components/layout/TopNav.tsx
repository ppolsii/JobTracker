"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/config/navigation";
import { MobileSidebar } from "@/shared/components/layout/MobileSidebar";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { Input } from "@/shared/components/ui/input";

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
      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* Wired up in Phase 13 (global search) - purely presentational for now. */}
        <Input type="search" placeholder="Search..." className="pl-8" />
      </div>
      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <ThemeToggle />
        {userMenu}
      </div>
    </header>
  );
}
