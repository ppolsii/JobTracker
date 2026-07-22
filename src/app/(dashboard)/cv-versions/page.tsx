import { Archive } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { CVVersionCreateButton } from "@/features/cv/components/CVVersionCreateButton";
import { CVVersionsTable } from "@/features/cv/components/CVVersionsTable";
import { listCVVersionsSchema } from "@/features/cv/schemas/cv-version.schema";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = { title: "CV Versions" };

function buildPageUrl(page: number, archived: boolean) {
  const params = new URLSearchParams();
  if (archived) params.set("archived", "true");
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

  const { archived, page, limit } = listCVVersionsSchema.parse(
    await searchParams
  );

  const result = archived
    ? await CVVersionService.listArchived(user.id, { page, limit })
    : await CVVersionService.list(user.id, { page, limit });
  if (!result.success) {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const { cvVersions, total } = result.data;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {archived ? "Archived CV Versions" : "CV Versions"}
        </h2>
        <div className="flex items-center gap-2">
          {archived ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={ROUTES.CV_VERSIONS} />}
            >
              Back to active
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href={`${ROUTES.CV_VERSIONS}?archived=true`} />}
              >
                <Archive className="size-4" />
                Archived
              </Button>
              <CVVersionCreateButton />
            </>
          )}
        </div>
      </div>

      <CVVersionsTable
        cvVersions={cvVersions}
        pageSize={limit}
        archived={archived}
      />

      <PaginationControls
        page={page}
        pageCount={pageCount}
        buildHref={(p) => buildPageUrl(p, archived)}
      />
    </div>
  );
}
