import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { CVVersionCreateButton } from "@/features/cv/components/CVVersionCreateButton";
import { CVVersionsTable } from "@/features/cv/components/CVVersionsTable";
import { listCVVersionsSchema } from "@/features/cv/schemas/cv-version.schema";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import { PaginationControls } from "@/shared/components/PaginationControls";

export const metadata: Metadata = { title: "CV Versions" };

function buildPageUrl(page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  return `${ROUTES.CV_VERSIONS}?${params.toString()}`;
}

export default async function CVVersionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const { page, limit } = listCVVersionsSchema.parse(await searchParams);

  const result = await CVVersionService.list(user.id, { page, limit });
  if (!result.success) {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const { cvVersions, total } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">CV Versions</h2>
        <CVVersionCreateButton />
      </div>

      <CVVersionsTable cvVersions={cvVersions} pageSize={limit} />

      <PaginationControls
        page={page}
        pageCount={pageCount}
        buildHref={buildPageUrl}
      />
    </div>
  );
}
