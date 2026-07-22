"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import {
  createInterviewFeedbackAction,
  updateInterviewFeedbackAction,
} from "@/features/interview-feedback/actions/interview-feedback.actions";
import { INTERVIEW_FORMAT_OPTIONS } from "@/features/interview-feedback/constants/interview-feedback.constants";
import { createInterviewFeedbackSchema } from "@/features/interview-feedback/schemas/interview-feedback.schema";
import type { InterviewFeedback } from "@/features/interview-feedback/types/interview-feedback.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

const NONE_VALUE = "__none__";
const RATING_VALUES = [1, 2, 3, 4, 5];

// react-hook-form's resolver needs the pre-parse (input) shape here, distinct
// from the schema's inferred output - createInterviewFeedbackSchema coerces
// `rating` to a number, and useForm's field-values generic must match what
// defaultValues/Controller actually hold before validation runs (same fix
// ApplicationForm.tsx applies for salary_min/salary_max).
type InterviewFeedbackFormValues = z.input<typeof createInterviewFeedbackSchema>;

interface InterviewFeedbackFormProps {
  applicationId: string;
  applicationStatusHistoryId: string;
  feedback?: InterviewFeedback;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InterviewFeedbackForm({
  applicationId,
  applicationStatusHistoryId,
  feedback,
  onSuccess,
  onCancel,
}: InterviewFeedbackFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InterviewFeedbackFormValues>({
    resolver: zodResolver(createInterviewFeedbackSchema),
    defaultValues: {
      application_id: applicationId,
      application_status_history_id: applicationStatusHistoryId,
      rating: feedback?.rating ?? undefined,
      format: feedback?.format ?? undefined,
      notes: feedback?.notes ?? "",
    },
  });

  async function onSubmit(values: InterviewFeedbackFormValues) {
    const result = feedback
      ? await updateInterviewFeedbackAction({
          id: feedback.id,
          application_id: applicationId,
          rating: values.rating,
          format: values.format,
          notes: values.notes,
        })
      : await createInterviewFeedbackAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(feedback ? "Feedback updated." : "Feedback added.");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field orientation="responsive" data-invalid={!!errors.rating}>
          <FieldLabel htmlFor="rating">Rating</FieldLabel>
          <Controller
            name="rating"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : Number(value))
                }
              >
                <SelectTrigger id="rating" className="w-full">
                  <SelectValue placeholder="No rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No rating</SelectItem>
                  {RATING_VALUES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.rating]} />
        </Field>

        <Field orientation="responsive" data-invalid={!!errors.format}>
          <FieldLabel htmlFor="format">Format</FieldLabel>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="format" className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Not specified</SelectItem>
                  {INTERVIEW_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.format]} />
        </Field>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="notes" required>
            Feedback
          </FieldLabel>
          <Textarea id="notes" rows={5} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {feedback ? "Save changes" : "Add feedback"}
        </Button>
      </div>
    </form>
  );
}
