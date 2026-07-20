"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveCVVersionAction } from "@/features/cv/actions/cv-version.actions";
import { CVVersionFormDialog } from "@/features/cv/components/CVVersionFormDialog";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";

export function CVVersionsTable({
  cvVersions,
  pageSize,
}: {
  cvVersions: CVVersion[];
  pageSize: number;
}) {
  const [editingCVVersion, setEditingCVVersion] = useState<CVVersion | null>(
    null
  );
  const [archivingCVVersion, setArchivingCVVersion] =
    useState<CVVersion | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: DataTableColumn<CVVersion>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (cv) => cv.name.toLowerCase(),
      render: (cv) => cv.name,
    },
    {
      key: "description",
      header: "Description",
      render: (cv) => cv.description ?? "—",
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (cv) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${cv.name}`}
            onClick={() => setEditingCVVersion(cv)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Archive ${cv.name}`}
            onClick={() => setArchivingCVVersion(cv)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  function handleArchiveConfirm() {
    if (!archivingCVVersion) return;
    const target = archivingCVVersion;

    startTransition(async () => {
      const result = await archiveCVVersionAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.name} archived.`);
      setArchivingCVVersion(null);
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={cvVersions}
        getRowId={(cv) => cv.id}
        pageSize={pageSize}
        emptyState={
          <EmptyState
            title="No CV versions yet"
            description="Create the CV variants you use when applying so you can track which one performs best."
          />
        }
      />
      <CVVersionFormDialog
        open={!!editingCVVersion}
        onOpenChange={(open) => !open && setEditingCVVersion(null)}
        cvVersion={editingCVVersion ?? undefined}
      />
      <ConfirmDialog
        open={!!archivingCVVersion}
        onOpenChange={(open) => !open && setArchivingCVVersion(null)}
        title={`Archive ${archivingCVVersion?.name ?? "this CV version"}?`}
        description="Archived CV versions are hidden from lists but preserved for historical analytics."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
