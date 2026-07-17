"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveCompanyAction } from "@/features/companies/actions/company.actions";
import { CompanyFormDialog } from "@/features/companies/components/CompanyFormDialog";
import type { Company } from "@/features/companies/types/company.types";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";

export function CompaniesTable({
  companies,
  pageSize,
}: {
  companies: Company[];
  pageSize: number;
}) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [archivingCompany, setArchivingCompany] = useState<Company | null>(null);
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
      render: (c) => (
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

  return (
    <>
      <DataTable
        columns={columns}
        data={companies}
        getRowId={(c) => c.id}
        pageSize={pageSize}
        emptyState={
          <EmptyState
            title="No companies yet"
            description="Add the companies you're applying to so you can track them and see analytics later."
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
    </>
  );
}
