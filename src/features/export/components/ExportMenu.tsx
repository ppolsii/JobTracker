"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  exportCSVAction,
  exportJSONAction,
} from "@/features/export/actions/export.actions";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const EXPORT_FILE_BASENAME = "jobtracker-export";

// Triggers a browser download client-side from a Server Action's returned
// file text - this app has no Route Handlers anywhere (every API.md "GET"
// endpoint is already served through a Server Action/Component, never a new
// `route.ts`), so a download endpoint isn't introduced here either.
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// UI_SYSTEM.md's Top Navigation already houses Search (Phase 13) as the
// other global, not-page-specific data action - Export follows the same
// placement rather than inventing a new page (no "Export Page" is
// documented anywhere in UI_SYSTEM.md).
export function ExportMenu() {
  const [isPending, startTransition] = useTransition();

  function handleExport(format: "csv" | "json") {
    startTransition(async () => {
      const result =
        format === "csv" ? await exportCSVAction() : await exportJSONAction();

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      downloadFile(
        result.data,
        `${EXPORT_FILE_BASENAME}.${format}`,
        format === "csv" ? "text/csv" : "application/json"
      );
      toast.success(`Export ready: ${EXPORT_FILE_BASENAME}.${format}`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" disabled={isPending} />}
        aria-label="Export your data"
      >
        <Download className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export applications as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export all data as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
