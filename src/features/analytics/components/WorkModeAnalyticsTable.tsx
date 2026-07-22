"use client";

import type { WorkModeAnalyticsRow } from "@/features/analytics/types/analytics.types";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";

// ANALYTICS_ENGINE.md "Work Mode Analytics": Applications, Interview Rate,
// Offer Rate, Acceptance Rate only - a deliberately smaller column set than
// AnalyticsComparisonTable's (Company/CV/Source/Monthly), matching
// WorkModeAnalyticsRow's own shape rather than forcing it into that table.
export function WorkModeAnalyticsTable({
  rows,
}: {
  rows: WorkModeAnalyticsRow[];
}) {
  const columns: DataTableColumn<WorkModeAnalyticsRow>[] = [
    {
      key: "name",
      header: "Work Mode",
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
      key: "interviewRate",
      header: "Interview Rate",
      sortable: true,
      sortValue: (row) => row.interviewRate ?? -1,
      render: (row) =>
        row.interviewRate === null ? "—" : `${row.interviewRate}%`,
    },
    {
      key: "offerRate",
      header: "Offer Rate",
      sortable: true,
      sortValue: (row) => row.offerRate ?? -1,
      render: (row) => (row.offerRate === null ? "—" : `${row.offerRate}%`),
    },
    {
      key: "acceptanceRate",
      header: "Acceptance Rate",
      sortable: true,
      sortValue: (row) => row.acceptanceRate ?? -1,
      render: (row) =>
        row.acceptanceRate === null ? "—" : `${row.acceptanceRate}%`,
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
          title="No work mode data yet"
          description="Record a work mode on your applications to see a breakdown here."
        />
      }
    />
  );
}
