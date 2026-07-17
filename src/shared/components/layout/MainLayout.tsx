import { Sidebar } from "@/shared/components/layout/Sidebar";
import { TopNav } from "@/shared/components/layout/TopNav";

// The reusable app shell (UI_SYSTEM.md "Layout"). Fully generic: `footer`
// and `userMenu` are slots the caller fills in, so this component never
// needs to know anything about auth or any other feature.
export function MainLayout({
  footer,
  userMenu,
  children,
}: {
  footer?: React.ReactNode;
  userMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar footer={footer} />
      <div className="flex flex-1 flex-col">
        <TopNav footer={footer} userMenu={userMenu} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
