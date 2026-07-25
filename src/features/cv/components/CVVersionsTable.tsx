"use client";

import { ArchiveRestore, Download, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  archiveCVVersionAction,
  getCVDownloadUrlAction,
  restoreCVVersionAction,
} from "@/features/cv/actions/cv-version.actions";
import { CVVersionFormDialog } from "@/features/cv/components/CVVersionFormDialog";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { formatFileSize } from "@/features/cv/utils/cv-file-validation";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

// IMPLEMENTATION_ORDER_V2.md Phase 26: `archived` swaps Edit/Delete for a
// single Restore action, mirroring CompaniesTable's same treatment.
export function CVVersionsTable({
  cvVersions,
  pageSize,
  archived = false,
}: {
  cvVersions: CVVersion[];
  pageSize: number;
  archived?: boolean;
}) {
  const [editingCVVersion, setEditingCVVersion] = useState<CVVersion | null>(
    null
  );
  const [deletingCVVersion, setDeletingCVVersion] = useState<CVVersion | null>(
    null
  );
  const [restoringCVVersion, setRestoringCVVersion] =
    useState<CVVersion | null>(null);
  // Phase 40 (CV Library) "CV DELETION": archiving a CV version still
  // never succeeds while an application references it (BUSINESS_RULES.md
  // "CV Rules" - unchanged) - this holds the friendly, actionable message
  // CVVersionService already returns for that case, shown instead of a
  // dead-end toast.
  const [blockedDelete, setBlockedDelete] = useState<{
    name: string;
    message: string;
  } | null>(null);
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
      key: "file",
      header: "File",
      render: (cv) =>
        cv.file_name ? (
          <span>
            {cv.file_name}
            {cv.file_size ? (
              <span className="text-muted-foreground">
                {" "}
                ({formatFileSize(cv.file_size)})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">No file uploaded</span>
        ),
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
      render: (cv) =>
        archived ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Restore ${cv.name}`}
              onClick={() => setRestoringCVVersion(cv)}
            >
              <ArchiveRestore className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            {cv.file_path ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${cv.name}`}
                disabled={isPending}
                onClick={() => handleDownload(cv)}
              >
                <Download className="size-4" />
              </Button>
            ) : null}
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
              aria-label={`Delete ${cv.name}`}
              onClick={() => setDeletingCVVersion(cv)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
    },
  ];

  function handleDownload(cv: CVVersion) {
    startTransition(async () => {
      const result = await getCVDownloadUrlAction({ id: cv.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  // "If unused, allow permanent deletion. If referenced, ... never allow
  // deleting a referenced CV": attempted directly (the same "attempt the
  // action, then react" pattern this codebase already uses for Pro-gating)
  // rather than a separate pre-check query - CVVersionService.archive
  // already tells us definitively whether it's referenced.
  function handleDeleteConfirm() {
    if (!deletingCVVersion) return;
    const target = deletingCVVersion;

    startTransition(async () => {
      const result = await archiveCVVersionAction({ id: target.id });
      setDeletingCVVersion(null);

      if (!result.success) {
        if (result.error.code === ERROR_CODES.CONFLICT) {
          setBlockedDelete({ name: target.name, message: result.error.message });
          return;
        }
        toast.error(result.error.message);
        return;
      }

      toast.success(`${target.name} deleted.`);
    });
  }

  function handleRestoreConfirm() {
    if (!restoringCVVersion) return;
    const target = restoringCVVersion;

    startTransition(async () => {
      const result = await restoreCVVersionAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.name} restored.`);
      setRestoringCVVersion(null);
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
            title={archived ? "No archived CV versions" : "No CV versions yet"}
            description={
              archived
                ? "CV versions you delete will appear here, ready to restore."
                : "Upload the CVs you use when applying - you'll also be able to upload one directly while creating your first application."
            }
          />
        }
      />
      <CVVersionFormDialog
        open={!!editingCVVersion}
        onOpenChange={(open) => !open && setEditingCVVersion(null)}
        cvVersion={editingCVVersion ?? undefined}
      />
      <ConfirmDialog
        open={!!deletingCVVersion}
        onOpenChange={(open) => !open && setDeletingCVVersion(null)}
        title={`Delete ${deletingCVVersion?.name ?? "this CV version"}?`}
        description="This can't be undone. It will no longer appear in your CV library or when creating applications."
        confirmLabel="Delete"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleDeleteConfirm}
      />
      <ConfirmDialog
        open={!!restoringCVVersion}
        onOpenChange={(open) => !open && setRestoringCVVersion(null)}
        title={`Restore ${restoringCVVersion?.name ?? "this CV version"}?`}
        description="This CV version will reappear in your active list."
        confirmLabel="Restore"
        isConfirming={isPending}
        onConfirm={handleRestoreConfirm}
      />
      <AlertDialog
        open={!!blockedDelete}
        onOpenChange={(open) => !open && setBlockedDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Can&apos;t delete {blockedDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockedDelete?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedDelete(null)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
