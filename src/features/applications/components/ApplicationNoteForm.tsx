"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createApplicationNoteAction,
  updateApplicationNoteAction,
} from "@/features/applications/actions/application-note.actions";
import {
  createApplicationNoteSchema,
  type CreateApplicationNoteInput,
} from "@/features/applications/schemas/application.schema";
import type { ApplicationNote } from "@/features/applications/types/application.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";

interface ApplicationNoteFormProps {
  applicationId: string;
  note?: ApplicationNote;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationNoteForm({
  applicationId,
  note,
  onSuccess,
  onCancel,
}: ApplicationNoteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateApplicationNoteInput>({
    resolver: zodResolver(createApplicationNoteSchema),
    defaultValues: {
      application_id: applicationId,
      content: note?.content ?? "",
    },
  });

  async function onSubmit(values: CreateApplicationNoteInput) {
    const result = note
      ? await updateApplicationNoteAction({
          id: note.id,
          content: values.content,
        })
      : await createApplicationNoteAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(note ? "Note updated." : "Note added.");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.content}>
          <FieldLabel htmlFor="content" required>
            Note
          </FieldLabel>
          <Textarea id="content" rows={6} {...register("content")} />
          <FieldError errors={[errors.content]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {note ? "Save changes" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
