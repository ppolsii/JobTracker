import { SidebarNav } from "@/shared/components/layout/SidebarNav";

// Desktop-only fixed sidebar (UI_SYSTEM.md: Desktop >= 1024px). Hidden below
// lg; MobileSidebar covers the drawer equivalent for smaller screens.
export function Sidebar({ footer }: { footer?: React.ReactNode }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-4 lg:flex lg:flex-col">
      <SidebarNav footer={footer} />
    </aside>
  );
}
