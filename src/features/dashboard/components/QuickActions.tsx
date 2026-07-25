import { NewApplicationButton } from "@/features/applications/components/NewApplicationButton";

// IMPLEMENTATION_ORDER_V2.md Phase 40 "DASHBOARD": replaces the previous
// three separate create buttons (Company/CV/Application) with the single
// "+ New Application" entry point every other creation surface now shares -
// creating an application is the central workflow (this phase's own
// DESIGN PRINCIPLE), so Companies/CVs are no longer offered as a starting
// point here; both remain reachable inline from within the application
// form itself (CompanyCombobox / "+ Upload new CV").
export function QuickActions({
  companies,
  cvVersions,
}: {
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <NewApplicationButton companies={companies} cvVersions={cvVersions} />
    </div>
  );
}
