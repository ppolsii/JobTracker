"use server";

import { AuthService } from "@/features/auth/services/auth.service";
import { ExportService } from "@/features/export/services/export.service";
import type { ActionResult } from "@/types/action-result";

// Called directly from ExportMenu (a client component in TopNav), not a
// form submission - Export only reads existing data (BUSINESS_RULES.md
// "Export must never redefine business rules" / "does not modify data"),
// so there is nothing to revalidate.
export async function exportCSVAction(): Promise<ActionResult<string>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  return ExportService.exportCSV(auth.data);
}

export async function exportJSONAction(): Promise<ActionResult<string>> {
  const auth = await AuthService.requireUserId();
  if (!auth.success) return auth;

  return ExportService.exportJSON(auth.data);
}
