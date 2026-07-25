import { Sidebar } from "@/shared/components/layout/Sidebar";
import { TopNav } from "@/shared/components/layout/TopNav";

// The reusable app shell (UI_SYSTEM.md "Layout"). Fully generic: `footer`,
// `search`, `exportMenu` and `userMenu` are slots the caller fills in, so
// this component never needs to know anything about auth or any other
// feature.
export function MainLayout({
  footer,
  search,
  exportMenu,
  notificationBell,
  userMenu,
  showProBadge,
  children,
}: {
  footer?: React.ReactNode;
  search: React.ReactNode;
  exportMenu: React.ReactNode;
  // Phase 36 (Notification Center): the bell icon - a slot, same reasoning
  // as `search`/`exportMenu`.
  notificationBell?: React.ReactNode;
  userMenu: React.ReactNode;
  // Phase 31.5 (Pro Plan Foundation): whether the Pricing nav item should
  // show its "Pro" upsell badge - a plain boolean slot, not a Billing import,
  // for the same reason `search`/`exportMenu` are ReactNode slots.
  showProBadge?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar footer={footer} showProBadge={showProBadge} />
      <div className="flex flex-1 flex-col">
        <TopNav
          footer={footer}
          search={search}
          exportMenu={exportMenu}
          notificationBell={notificationBell}
          userMenu={userMenu}
          showProBadge={showProBadge}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
