"use client";

import { ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  archiveCompanyAction,
  restoreCompanyAction,
} from "@/features/companies/actions/company.actions";
import { CompanyFormDialog } from "@/features/companies/components/CompanyFormDialog";
import type { Company } from "@/features/companies/types/company.types";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";

// IMPLEMENTATION_ORDER_V2.md Phase 26: `archived` swaps Edit/Archive for a
// single Restore action, reusing this same table rather than a parallel
// "ArchivedCompaniesTable" component - the row shape is identical, only the
// available actions differ.
export function CompaniesTable({
  companies,
  pageSize,
  archived = false,
}: {
  companies: Company[];
  pageSize: number;
  archived?: boolean;
}) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [archivingCompany, setArchivingCompany] = useState<Company | null>(null);
  const [restoringCompany, setRestoringCompany] = useState<Company | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const columns: DataTableColumn<Company>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (c) => c.name.toLowerCase(),
      render: (c) => c.name,
    },
    { key: "industry", header: "Industry", render: (c) => c.industry ?? "—" },
    { key: "city", header: "City", render: (c) => c.city ?? "—" },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) =>
        archived ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Restore ${c.name}`}
              onClick={() => setRestoringCompany(c)}
            >
              <ArchiveRestore className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${c.name}`}
              onClick={() => setEditingCompany(c)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Archive ${c.name}`}
              onClick={() => setArchivingCompany(c)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
    },
  ];

  function handleArchiveConfirm() {
    if (!archivingCompany) return;
    const target = archivingCompany;

    startTransition(async () => {
      const result = await archiveCompanyAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.name} archived.`);
      setArchivingCompany(null);
    });
  }

  function handleRestoreConfirm() {
    if (!restoringCompany) return;
    const target = restoringCompany;

    startTransition(async () => {
      const result = await restoreCompanyAction({ id: target.id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${target.name} restored.`);
      setRestoringCompany(null);
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={companies}
        getRowId={(c) => c.id}
        pageSize={pageSize}
        emptyState={
          <EmptyState
            title={archived ? "No archived companies" : "No companies yet"}
            description={
              archived
                ? "Companies you archive will appear here, ready to restore."
                : "Add the companies you're applying to so you can track them and see analytics later."
            }
          />
        }
      />
      <CompanyFormDialog
        open={!!editingCompany}
        onOpenChange={(open) => !open && setEditingCompany(null)}
        company={editingCompany ?? undefined}
      />
      <ConfirmDialog
        open={!!archivingCompany}
        onOpenChange={(open) => !open && setArchivingCompany(null)}
        title={`Archive ${archivingCompany?.name ?? "this company"}?`}
        description="Archived companies are hidden from lists but preserved for historical analytics."
        confirmLabel="Archive"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleArchiveConfirm}
      />
      <ConfirmDialog
        open={!!restoringCompany}
        onOpenChange={(open) => !open && setRestoringCompany(null)}
        title={`Restore ${restoringCompany?.name ?? "this company"}?`}
        description="This company will reappear in your active list."
        confirmLabel="Restore"
        isConfirming={isPending}
        onConfirm={handleRestoreConfirm}
      />
    </>
  );
}
