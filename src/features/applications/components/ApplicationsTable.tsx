"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveApplicationAction } from "@/features/applications/actions/application.actions";
import { ApplicationFormDialog } from "@/features/applications/components/ApplicationFormDialog";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { applicationDetailRoute } from "@/config/routes";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";

// No column here is marked `sortable` - see ApplicationFilterBar's comment:
// sorting is server-side across the full result set, driven by that
// component's own "Sort by" control, not DataTable's per-page client sort.
export function ApplicationsTable({
  applications,
  pageSize,
  companies,
  cvVersions,
}: {
  applications: ApplicationWithRelations[];
  pageSize: number;
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
}) {
  const [editingApplication, setEditingApplication] =
    useState<ApplicationWithRelations | null>(null);
  const [archivingApplication, setArchivingApplication] =
    useState<ApplicationWithRelations | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: DataTableColumn<ApplicationWithRelations>[] = [
    { key: "position", header: "Position", render: (a) => a.position },
    {
      key: "company",
      header: "Company",
      render: (a) => a.companies?.name ?? "—",
    },
    {
      key: "cv_version",
      header: "CV Version",
      render: (a) => a.cv_versions?.name ?? "—",
    },
    { key: "status", header: "Status", render: (a) => a.current_status },
    {
      key: "application_date",
      header: "Application Date",
      render: (a) => a.application_date ?? "—",
    },
    {
      key: "work_mode",
      header: "Work Mode",
      render: (a) => a.work_mode ?? "—",
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`View ${a.position}`}
            render={<Link href={applicationDetailRoute(a.id)} />}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${a.position}`}
            onClick={() => setEditingApplication(a)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Archive ${a.position}`}
            onClick={() => setArchivingApplication(a)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  function handleArchiveConfirm() {
    if (!archivingApplication) return;
    const target = archivingApplication;

    startTransition(async () => {
      const result = await archiveApplicationAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.position} archived.`);
      setArchivingApplication(null);
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={applications}
        getRowId={(a) => a.id}
        pageSize={pageSize}
        emptyState={
          <EmptyState
            title="No applications yet"
            description="Create your first application to start tracking your job search."
          />
        }
      />
      <ApplicationFormDialog
        open={!!editingApplication}
        onOpenChange={(open) => !open && setEditingApplication(null)}
        application={editingApplication ?? undefined}
        companies={companies}
        cvVersions={cvVersions}
      />
      <ConfirmDialog
        open={!!archivingApplication}
        onOpenChange={(open) => !open && setArchivingApplication(null)}
        title={`Archive ${archivingApplication?.position ?? "this application"}?`}
        description="Archived applications are hidden from lists but preserved for historical analytics."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
