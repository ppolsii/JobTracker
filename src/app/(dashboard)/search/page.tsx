import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { applicationDetailRoute, ROUTES } from "@/config/routes";
import { AuthService } from "@/features/auth/services/auth.service";
import { SEARCH_PAGE_LIMIT } from "@/features/search/constants/search.constants";
import { searchPageSchema } from "@/features/search/schemas/search.schema";
import { SearchService } from "@/features/search/services/search.service";
import { EmptyState } from "@/shared/components/EmptyState";
import { PaginationControls } from "@/shared/components/PaginationControls";

export const metadata: Metadata = { title: "Search" };

type SearchEntityPageKey = "companiesPage" | "applicationsPage" | "notesPage";

// IMPLEMENTATION_ORDER_V2.md Phase 27: three sections, each independently
// paginated (its own query param) - building one section's link preserves
// the query and the other two sections' current pages unchanged.
function buildSectionPageUrl(
  query: string,
  currentPages: Record<SearchEntityPageKey, number>,
  key: SearchEntityPageKey,
  page: number
): string {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("companiesPage", String(key === "companiesPage" ? page : currentPages.companiesPage));
  params.set("applicationsPage", String(key === "applicationsPage" ? page : currentPages.applicationsPage));
  params.set("notesPage", String(key === "notesPage" ? page : currentPages.notesPage));
  return `${ROUTES.SEARCH}?${params.toString()}`;
}

// UI_SYSTEM.md's Top Navigation "Search" is a dropdown with a fixed result
// cap (KNOWN_ISSUES.md, Phase 13) - this page is that dropdown's "view all
// results" destination, reusing SearchService entirely (no new business
// logic, no new repository - see SearchService's own comment).
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const params = searchPageSchema.parse(await searchParams);
  const query = params.query ?? "";

  if (!query) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Search</h2>
        <EmptyState
          title="Search your data"
          description="Search companies, applications, and notes from the search box in the top navigation."
        />
      </div>
    );
  }

  const result = await SearchService.search(user.id, query, {
    companiesPage: params.companiesPage,
    applicationsPage: params.applicationsPage,
    notesPage: params.notesPage,
    limit: SEARCH_PAGE_LIMIT,
  });

  if (!result.success) {
    return <p className="text-sm text-destructive">{result.error.message}</p>;
  }

  const {
    companies,
    companiesTotal,
    applications,
    applicationsTotal,
    notes,
    notesTotal,
  } = result.data;

  const currentPages: Record<SearchEntityPageKey, number> = {
    companiesPage: params.companiesPage,
    applicationsPage: params.applicationsPage,
    notesPage: params.notesPage,
  };

  const hasAnyResults =
    companies.length > 0 || applications.length > 0 || notes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">
        Search results for &quot;{query}&quot;
      </h2>

      {!hasAnyResults ? (
        <EmptyState
          title="No results"
          description={`Nothing matched "${query}".`}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Companies ({companiesTotal})
            </h3>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching companies.
              </p>
            ) : (
              <ul className="flex flex-col">
                {companies.map((company) => (
                  <li key={company.id}>
                    <Link
                      href={`${ROUTES.COMPANIES}?query=${encodeURIComponent(company.name)}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {company.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <PaginationControls
              page={params.companiesPage}
              pageCount={Math.max(1, Math.ceil(companiesTotal / SEARCH_PAGE_LIMIT))}
              buildHref={(p) =>
                buildSectionPageUrl(query, currentPages, "companiesPage", p)
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Applications ({applicationsTotal})
            </h3>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching applications.
              </p>
            ) : (
              <ul className="flex flex-col">
                {applications.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={applicationDetailRoute(application.id)}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {application.position}
                      {application.companyName
                        ? ` · ${application.companyName}`
                        : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <PaginationControls
              page={params.applicationsPage}
              pageCount={Math.max(
                1,
                Math.ceil(applicationsTotal / SEARCH_PAGE_LIMIT)
              )}
              buildHref={(p) =>
                buildSectionPageUrl(query, currentPages, "applicationsPage", p)
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Notes ({notesTotal})
            </h3>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching notes.
              </p>
            ) : (
              <ul className="flex flex-col">
                {notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={applicationDetailRoute(note.applicationId)}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="line-clamp-1">{note.content}</span>
                      {note.applicationPosition ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {note.applicationPosition}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <PaginationControls
              page={params.notesPage}
              pageCount={Math.max(1, Math.ceil(notesTotal / SEARCH_PAGE_LIMIT))}
              buildHref={(p) =>
                buildSectionPageUrl(query, currentPages, "notesPage", p)
              }
            />
          </section>
        </div>
      )}
    </div>
  );
}
