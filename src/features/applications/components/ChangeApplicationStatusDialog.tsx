"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { changeApplicationStatusAction } from "@/features/applications/actions/application-status.actions";
import {
  APPLICATION_STATUS_TRANSITIONS,
  needsApplicationDateForTransition,
} from "@/features/applications/constants/application.constants";
import {
  changeApplicationStatusSchema,
  type ChangeApplicationStatusInput,
} from "@/features/applications/schemas/application.schema";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface ChangeApplicationStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationWithRelations;
}

// `type="date"` inputs need `YYYY-MM-DD` in the browser's local timezone -
// deliberately not the schema's own `todayISODate()` (application.schema.ts),
// which is UTC-based and meant for server-safe "not in the future"
// validation, not for displaying "today" to a specific user.
function todayLocalDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// BUSINESS_RULES.md "Allowed State Transitions": the Select only ever offers
// APPLICATION_STATUS_TRANSITIONS[application.current_status] - the same
// source of truth ApplicationStatusService enforces server-side - so an
// invalid transition can't even be selected, though the Service re-validates
// regardless (CODE_STYLE.md "Never trust client input").
export function ChangeApplicationStatusDialog({
  open,
  onOpenChange,
  application,
}: ChangeApplicationStatusDialogProps) {
  const nextStatuses =
    APPLICATION_STATUS_TRANSITIONS[application.current_status];
  // DATABASE.md applications_date_required_after_wishlist_check: only asked
  // for when actually needed (leaving Wishlist without a date already set).
  const needsApplicationDate = needsApplicationDateForTransition(
    application.current_status,
    application.application_date
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ChangeApplicationStatusInput>({
    resolver: zodResolver(changeApplicationStatusSchema),
    defaultValues: {
      id: application.id,
      new_status: undefined,
      application_date: "",
    },
  });

  // UX improvement: pre-fill with today's local date each time the dialog
  // is (re)opened, so the common "change status, keep today's date, submit"
  // path needs no typing - the field stays fully editable for logging a
  // historical transition. Gated on `open` (not run on every render) so it
  // never overwrites a date the user has already changed before submitting -
  // Base UI keeps this dialog's content mounted after its first open (see
  // ApplicationFormDialog's own comment on the same behavior), so `open`
  // flipping to `true` is what "freshly opened" actually means here, not
  // component mount.
  useEffect(() => {
    if (open && needsApplicationDate) {
      setValue("application_date", todayLocalDateString());
    }
  }, [open, needsApplicationDate, setValue]);

  async function onSubmit(values: ChangeApplicationStatusInput) {
    const result = await changeApplicationStatusAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(`Status updated to ${result.data.current_status}.`);
    onOpenChange(false);
  }

  if (nextStatuses.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              This application has reached a final status (
              {application.current_status}) and cannot be moved further.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Current status: {application.current_status}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={!!errors.new_status}>
              <FieldLabel htmlFor="new_status" required>
                New status
              </FieldLabel>
              <Controller
                name="new_status"
                control={control}
                render={({ field }) => (
                  // Bug fix: same defect as ApplicationForm's CV Select -
                  // `defaultValues.new_status` is `undefined`, and
                  // `field.value || undefined` kept it `undefined` on the
                  // first render (uncontrolled), then flipped to a real
                  // status string once selected (controlled) - the classic
                  // React "changing an uncontrolled component to be
                  // controlled" transition, which also corrupts the
                  // trigger's label lookup. `?? ""` keeps the Select
                  // controlled with a defined string from render one; `""`
                  // itself already renders the placeholder (matches no
                  // status), so no extra sentinel value is needed.
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="new_status" className="w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.new_status]} />
            </Field>

            {needsApplicationDate ? (
              <Field data-invalid={!!errors.application_date}>
                <FieldLabel htmlFor="application_date" required>
                  Application date
                </FieldLabel>
                <Input
                  id="application_date"
                  type="date"
                  {...register("application_date")}
                />
                <FieldError errors={[errors.application_date]} />
              </Field>
            ) : null}
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Update status
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
