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
  userMenu,
  children,
}: {
  footer?: React.ReactNode;
  search: React.ReactNode;
  exportMenu: React.ReactNode;
  userMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar footer={footer} />
      <div className="flex flex-1 flex-col">
        <TopNav
          footer={footer}
          search={search}
          exportMenu={exportMenu}
          userMenu={userMenu}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
