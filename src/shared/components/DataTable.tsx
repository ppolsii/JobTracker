"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  // Required for a sortable column - `render` returns a ReactNode, not
  // necessarily a value that can be compared. A sortable column without
  // sortValue is silently treated as unsortable.
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
}

type SortState = { key: string; direction: "asc" | "desc" };

// Generic client-side table: sorting, pagination, selection, loading and
// empty states (UI_SYSTEM.md "Tables"). Filtering is deliberately not
// handled here - each feature composes its own filter controls and passes
// the already-filtered `data` in.
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyState,
  pageSize = 20,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return data;

    return [...data].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);
      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const allOnPageSelected =
    selectable &&
    pageData.length > 0 &&
    pageData.every((row) => selectedIds?.has(getRowId(row)));

  function toggleSelectAllOnPage() {
    if (!onSelectedIdsChange) return;
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageData.forEach((row) => next.delete(getRowId(row)));
    } else {
      pageData.forEach((row) => next.add(getRowId(row)));
    }
    onSelectedIdsChange(next);
  }

  function toggleRow(id: string) {
    if (!onSelectedIdsChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedIdsChange(next);
  }

  if (!isLoading && data.length === 0) {
    return (
      emptyState ?? (
        <EmptyState
          title="Nothing here yet"
          description="No records to display."
        />
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead className="w-8">
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAllOnPage}
                />
              </TableHead>
            ) : null}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable && column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {selectable ? (
                    <TableCell>
                      <Skeleton className="size-4" />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : pageData.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    key={id}
                    data-state={selectedIds?.has(id) ? "selected" : undefined}
                  >
                    {selectable ? (
                      <TableCell>
                        <Checkbox
                          aria-label="Select row"
                          checked={selectedIds?.has(id) ?? false}
                          onCheckedChange={() => toggleRow(id)}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
