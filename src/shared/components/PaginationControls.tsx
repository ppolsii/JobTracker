import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}

// Phase 16 (Optimisation) "Remove duplicated code": the identical
// "Page X of Y / Previous / Next" footer was copy-pasted across the
// Applications, Companies, and CV Versions list pages - same markup, same
// disabled-at-the-edges behaviour, differing only in how each page builds
// its own next/previous URL (its own query params). Feature-agnostic
// presentation only (no business logic), matching three already-existing
// use cases - the project's own bar for a shared/ extraction.
export function PaginationControls({
  page,
  pageCount,
  buildHref,
}: PaginationControlsProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildHref(page - 1)} />}
          >
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildHref(page + 1)} />}
          >
            Next
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
