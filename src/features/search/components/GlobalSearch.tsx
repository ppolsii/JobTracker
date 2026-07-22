"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { searchAction } from "@/features/search/actions/search.actions";
import type { SearchResults } from "@/features/search/types/search.types";
import { applicationDetailRoute, ROUTES } from "@/config/routes";
import { Input } from "@/shared/components/ui/input";

const DEBOUNCE_MS = 300;

const EMPTY_RESULTS: SearchResults = {
  companies: [],
  companiesTotal: 0,
  applications: [],
  applicationsTotal: 0,
  notes: [],
  notesTotal: 0,
};

function totalResults(results: SearchResults): number {
  return (
    results.companies.length +
    results.applications.length +
    results.notes.length
  );
}

// UI_SYSTEM.md "Top Navigation": "Search." API.md "Search": "Global search.
// Searches Companies, Applications, Notes." This is the client half of
// Phase 13 - TopNav's placeholder Input (see its own comment) is replaced by
// this component, matching the URL-param-driven search boxes already used
// by Applications/Companies in spirit, but querying live via a Server
// Action instead of a URL param: this search spans three different
// destination pages at once, so there is no single list page whose
// searchParams it could update.
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      setResults(EMPTY_RESULTS);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const result = await searchAction({ query: value });
      setIsLoading(false);
      if (result.success) {
        setResults(result.data);
        setIsOpen(true);
      }
    }, DEBOUNCE_MS);
  }

  function closeAndReset() {
    setIsOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
  }

  const hasResults = totalResults(results) > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (hasResults) setIsOpen(true);
        }}
        className="pl-8"
        aria-label="Search companies, applications and notes"
      />

      {isOpen ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          {isLoading ? (
            <p className="p-2 text-sm text-muted-foreground">Searching...</p>
          ) : !hasResults ? (
            <p className="p-2 text-sm text-muted-foreground">
              No results found.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.companies.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                    Companies
                  </p>
                  <ul className="flex flex-col">
                    {results.companies.map((company) => (
                      <li key={company.id}>
                        <Link
                          href={`${ROUTES.COMPANIES}?query=${encodeURIComponent(company.name)}`}
                          onClick={closeAndReset}
                          className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          {company.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.applications.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                    Applications
                  </p>
                  <ul className="flex flex-col">
                    {results.applications.map((application) => (
                      <li key={application.id}>
                        <Link
                          href={applicationDetailRoute(application.id)}
                          onClick={closeAndReset}
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
                </section>
              ) : null}

              {results.notes.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                    Notes
                  </p>
                  <ul className="flex flex-col">
                    {results.notes.map((note) => (
                      <li key={note.id}>
                        <Link
                          href={applicationDetailRoute(note.applicationId)}
                          onClick={closeAndReset}
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
                </section>
              ) : null}

              <Link
                href={`${ROUTES.SEARCH}?query=${encodeURIComponent(query)}`}
                onClick={closeAndReset}
                className="block rounded-md px-2 py-1.5 text-center text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                View all results for &quot;{query}&quot;
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
