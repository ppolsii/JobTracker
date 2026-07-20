import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { ApplicationCreateButton } from "@/features/applications/components/ApplicationCreateButton";
import { ApplicationFilterBar } from "@/features/applications/components/ApplicationFilterBar";
import { ApplicationsTable } from "@/features/applications/components/ApplicationsTable";
import { listApplicationsSchema } from "@/features/applications/schemas/application.schema";
import { ApplicationPickerService } from "@/features/applications/services/application-picker.service";
import { ApplicationService } from "@/features/applications/services/application.service";
import { PaginationControls } from "@/shared/components/PaginationControls";

export const metadata: Metadata = { title: "Applications" };

function buildPageUrl(page: number, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${ROUTES.APPLICATIONS}?${next.toString()}`;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const resolvedSearchParams = await searchParams;
  const params = listApplicationsSchema.parse(resolvedSearchParams);

  const [applicationsResult, { companies, cvVersions }] = await Promise.all([
    ApplicationService.list(user.id, params),
    ApplicationPickerService.getOptions(user.id),
  ]);

  if (!applicationsResult.success) {
    return (
      <p className="text-sm text-destructive">
        {applicationsResult.error.message}
      </p>
    );
  }

  const { applications, total } = applicationsResult.data;
  const { limit, page } = params;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Applications</h2>
        <ApplicationCreateButton
          companies={companies}
          cvVersions={cvVersions}
        />
      </div>

      <ApplicationFilterBar
        defaultValues={{
          query: params.query ?? "",
          status: params.status ?? "",
          company_id: params.company_id ?? "",
          cv_version_id: params.cv_version_id ?? "",
          source: params.source ?? "",
          work_mode: params.work_mode ?? "",
          employment_type: params.employment_type ?? "",
          date_from: params.date_from ?? "",
          date_to: params.date_to ?? "",
          salary_min: params.salary_min?.toString() ?? "",
          salary_max: params.salary_max?.toString() ?? "",
          sort_by: params.sort_by,
          sort_dir: params.sort_dir,
        }}
        companies={companies}
        cvVersions={cvVersions}
      />

      <ApplicationsTable
        applications={applications}
        pageSize={limit}
        companies={companies}
        cvVersions={cvVersions}
      />

      <PaginationControls
        page={page}
        pageCount={pageCount}
        buildHref={(p) => buildPageUrl(p, currentParams)}
      />
    </div>
  );
}
