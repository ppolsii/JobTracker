import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { CompaniesTable } from "@/features/companies/components/CompaniesTable";
import { CompanyCreateButton } from "@/features/companies/components/CompanyCreateButton";
import { CompanySearchBar } from "@/features/companies/components/CompanySearchBar";
import { listCompaniesSchema } from "@/features/companies/schemas/company.schema";
import { CompanyService } from "@/features/companies/services/company.service";
import { PaginationControls } from "@/shared/components/PaginationControls";

export const metadata: Metadata = { title: "Companies" };

function buildPageUrl(page: number, query: string | undefined) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  params.set("page", String(page));
  return `${ROUTES.COMPANIES}?${params.toString()}`;
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const { query, page, limit } = listCompaniesSchema.parse(await searchParams);

  const result = await CompanyService.list(user.id, { query, page, limit });
  if (!result.success) {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const { companies, total } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Companies</h2>
        <CompanyCreateButton />
      </div>

      <CompanySearchBar defaultValue={query ?? ""} />

      <CompaniesTable companies={companies} pageSize={limit} />

      <PaginationControls
        page={page}
        pageCount={pageCount}
        buildHref={(p) => buildPageUrl(p, query)}
      />
    </div>
  );
}
