import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";

// IMPLEMENTATION_ORDER_V2.md Phase 37 (Landing Page & Marketing Website).
// The public site's own shell - entirely separate from (dashboard)/layout.tsx
// and (auth)/layout.tsx (neither of which this phase touches). No auth
// check here: unlike the dashboard shell, every page under this group is
// meant to be reachable by anonymous visitors.
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
