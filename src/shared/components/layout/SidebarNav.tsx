"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

// Generic nav-link list, reused by both the desktop Sidebar and the mobile
// drawer. Takes no dependency on any feature: the logout action is injected
// by the caller via `footer` (composed at the app layer, which is where
// features get wired together) rather than imported directly here.
// Phase 31.5 (Pro Plan Foundation): `showProBadge` is the same kind of
// caller-supplied slot, kept a plain boolean (not a Billing import) so this
// component still takes no feature dependency of its own.
export function SidebarNav({
  footer,
  showProBadge,
  onNavigate,
}: {
  footer?: React.ReactNode;
  showProBadge?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-4">
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {showProBadge && item.href === ROUTES.PRICING ? (
                <Badge variant="secondary" className="ml-auto">
                  Pro
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {footer ? <div className="border-t pt-4">{footer}</div> : null}
    </div>
  );
}
