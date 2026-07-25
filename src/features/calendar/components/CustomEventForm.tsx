"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/features/calendar/actions/calendar-event.actions";
import {
  createCalendarEventSchema,
  type CreateCalendarEventInput,
} from "@/features/calendar/schemas/calendar.schema";
import type { EditableCalendarEvent } from "@/features/calendar/types/calendar.types";
import { Button } from "@/shared/components/ui/button";
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
import { Textarea } from "@/shared/components/ui/textarea";

const NONE_VALUE = "__none__";

interface CustomEventFormProps {
  event?: EditableCalendarEvent;
  applicationOptions: { id: string; label: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

// "CREATE CUSTOM EVENT": "Fields: Title, Description, Date, Optional
// Application" - `type` (Reminder/Custom Event) additionally selects which
// of the two user-created "EVENT TYPES" this is. Reused for both create and
// edit (the same `event?` optional-record pattern every other form in this
// codebase already uses - ApplicationNoteForm, InterviewFeedbackForm).
export function CustomEventForm({
  event,
  applicationOptions,
  onSuccess,
  onCancel,
}: CustomEventFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCalendarEventInput>({
    resolver: zodResolver(createCalendarEventSchema),
    defaultValues: {
      type: event?.type ?? "custom",
      title: event?.title ?? "",
      description: event?.description ?? "",
      eventDate: event?.event_date ?? "",
      applicationId: event?.application_id ?? undefined,
    },
  });

  async function onSubmit(values: CreateCalendarEventInput) {
    const result = event
      ? await updateCalendarEventAction({ id: event.id, ...values })
      : await createCalendarEventAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(event ? "Event updated." : "Event created.");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.type}>
          <FieldLabel htmlFor="type" required>
            Type
          </FieldLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Event</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.type]} />
        </Field>

        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title" required>
            Title
          </FieldLabel>
          <Input id="title" {...register("title")} />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={!!errors.eventDate}>
          <FieldLabel htmlFor="eventDate" required>
            Date
          </FieldLabel>
          <Input id="eventDate" type="date" {...register("eventDate")} />
          <FieldError errors={[errors.eventDate]} />
        </Field>

        <Field data-invalid={!!errors.applicationId}>
          <FieldLabel htmlFor="applicationId">Application</FieldLabel>
          <Controller
            name="applicationId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="applicationId" className="w-full">
                  <SelectValue placeholder="No application" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No application</SelectItem>
                  {applicationOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.applicationId]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={4} {...register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
