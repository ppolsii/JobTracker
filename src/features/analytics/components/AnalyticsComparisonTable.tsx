"use client";

import type { GroupAnalyticsRow } from "@/features/analytics/types/analytics.types";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";

// Shared by Company/CV/Source/Monthly Analytics (identical row shape per
// ANALYTICS_ENGINE.md - see analytics.types.ts) - one reusable table, not
// four near-identical copies. All rows are already loaded in one bulk read
// (no server pagination for this small, bounded dataset), so DataTable's
// own client-side sort correctly covers the *entire* dataset here - unlike
// ApplicationsTable, which deliberately avoids DataTable's sort for exactly
// the opposite reason (there, data is paginated server-side).
export function AnalyticsComparisonTable({
  nameColumnLabel,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  nameColumnLabel: string;
  rows: GroupAnalyticsRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const columns: DataTableColumn<GroupAnalyticsRow>[] = [
    {
      key: "name",
      header: nameColumnLabel,
      sortable: true,
      sortValue: (row) => row.name.toLowerCase(),
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
      key: "interviews",
      header: "Interviews",
      sortable: true,
      sortValue: (row) => row.interviews,
      render: (row) => row.interviews,
    },
    {
      key: "offers",
      header: "Offers",
      sortable: true,
      sortValue: (row) => row.offers,
      render: (row) => row.offers,
    },
    {
      key: "accepted",
      header: "Accepted",
      sortable: true,
      sortValue: (row) => row.accepted,
      render: (row) => row.accepted,
    },
    {
      key: "rejected",
      header: "Rejected",
      sortable: true,
      sortValue: (row) => row.rejected,
      render: (row) => row.rejected,
    },
    {
      key: "responseRate",
      header: "Response Rate",
      sortable: true,
      sortValue: (row) => row.responseRate ?? -1,
      render: (row) =>
        row.responseRate === null ? "—" : `${row.responseRate}%`,
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
        <EmptyState title={emptyTitle} description={emptyDescription} />
      }
    />
  );
}
