"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
    formState: { errors, isSubmitting },
  } = useForm<ChangeApplicationStatusInput>({
    resolver: zodResolver(changeApplicationStatusSchema),
    defaultValues: {
      id: application.id,
      new_status: undefined,
      application_date: "",
    },
  });

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
                  <Select
                    value={field.value || undefined}
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
