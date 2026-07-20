import { ApplicationCreateButton } from "@/features/applications/components/ApplicationCreateButton";
import { CompanyCreateButton } from "@/features/companies/components/CompanyCreateButton";
import { CVVersionCreateButton } from "@/features/cv/components/CVVersionCreateButton";

// FEATURES.md Feature 7 "Quick Actions": reuses the three existing,
// fully self-contained create-button components verbatim (each already
// manages its own dialog) rather than inventing a new dashboard-specific
// creation UI - true one-click create, not just navigation links.
export function QuickActions({
  companies,
  cvVersions,
}: {
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ApplicationCreateButton companies={companies} cvVersions={cvVersions} />
      <CompanyCreateButton />
      <CVVersionCreateButton />
    </div>
  );
}
