"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface DangerConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  // Rendered as a bullet list below the description - use this to name the
  // specific things being permanently lost (e.g. "Status history", "Notes"),
  // rather than a single generic "this cannot be undone" line.
  consequences?: string[];
  confirmKeyword?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

// A stronger confirmation than ConfirmDialog, reserved for genuinely
// irreversible, high-consequence actions - first used by Application
// permanent deletion, and intended to be reused as-is by the future
// Account Deletion "Danger Zone" feature (IMPLEMENTATION_ORDER_V2.md
// Phase 40) rather than that feature inventing its own. On top of
// ConfirmDialog's own click-to-confirm, this requires typing an exact
// keyword (default "DELETE") before the destructive action enables - a
// fixed keyword rather than e.g. the record's own name, since it's simpler,
// language-independent, and just as effective at preventing an accidental
// click.
export function DangerConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmKeyword = "DELETE",
  confirmLabel = "Delete permanently",
  onConfirm,
  isConfirming = false,
}: DangerConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setTyped("");
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {consequences && consequences.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="danger-confirm-input" className="font-normal">
            Type <span className="font-semibold text-foreground">{confirmKeyword}</span> to
            confirm.
          </Label>
          <Input
            id="danger-confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={typed !== confirmKeyword}
            loading={isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
