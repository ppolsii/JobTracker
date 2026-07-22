"use client";

import { Eye } from "lucide-react";
import Link from "next/link";

import { applicationDetailRoute } from "@/config/routes";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { formatDateTime } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";

// Read-only glance view, not a management table: no Edit/Archive actions
// (those already exist on the full Applications list/detail pages), so no
// Company/CV Version option lists need fetching just to power this widget.
// DataTable (not a plain list, unlike Notes) is a good fit here - Position/
// Company/Status/Updated are genuinely columnar data.
export function RecentApplicationsTable({
  applications,
}: {
  applications: ApplicationWithRelations[];
}) {
  const columns: DataTableColumn<ApplicationWithRelations>[] = [
    { key: "position", header: "Position", render: (a) => a.position },
    {
      key: "company",
      header: "Company",
      render: (a) => a.companies?.name ?? "—",
    },
    { key: "status", header: "Status", render: (a) => a.current_status },
    {
      key: "updated_at",
      header: "Last Updated",
      render: (a) => (
        <time dateTime={a.updated_at} suppressHydrationWarning>
          {formatDateTime(a.updated_at)}
        </time>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`View ${a.position}`}
          nativeButton={false}
          render={<Link href={applicationDetailRoute(a.id)} />}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={applications}
      getRowId={(a) => a.id}
      pageSize={applications.length}
      emptyState={
        <EmptyState
          title="No applications yet"
          description="Create your first application to see your recent activity here."
        />
      }
    />
  );
}
