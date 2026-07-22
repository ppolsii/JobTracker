"use client";

import type { EmploymentTypeAnalyticsRow } from "@/features/analytics/types/analytics.types";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";

// ANALYTICS_ENGINE.md "Employment Type Analytics": Applications, Responses,
// Offers, Average Response Time only - no rates are documented for this
// grouping, so it gets its own column set rather than reusing
// AnalyticsComparisonTable's.
export function EmploymentTypeAnalyticsTable({
  rows,
}: {
  rows: EmploymentTypeAnalyticsRow[];
}) {
  const columns: DataTableColumn<EmploymentTypeAnalyticsRow>[] = [
    {
      key: "name",
      header: "Employment Type",
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => row.name,
    },
    {
      key: "applications",
      header: "Applications",
      sortable: true,
      sortValue: (row) => row.applications,
      render: (row) => row.applications,
    },
    {
      key: "responses",
      header: "Responses",
      sortable: true,
      sortValue: (row) => row.responses,
      render: (row) => row.responses,
    },
    {
      key: "offers",
      header: "Offers",
      sortable: true,
      sortValue: (row) => row.offers,
      render: (row) => row.offers,
    },
    {
      key: "averageResponseTimeDays",
      header: "Avg. Response Time",
      sortable: true,
      sortValue: (row) => row.averageResponseTimeDays ?? -1,
      render: (row) =>
        row.averageResponseTimeDays === null
          ? "—"
          : `${row.averageResponseTimeDays}d`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      pageSize={rows.length}
      emptyState={
        <EmptyState
          title="No employment type data yet"
          description="Record an employment type on your applications to see a breakdown here."
        />
      }
    />
  );
}
