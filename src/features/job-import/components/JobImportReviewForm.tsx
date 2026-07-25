"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { confirmJobImportAction } from "@/features/job-import/actions/job-import.actions";
import {
  confirmJobImportSchema,
  type ConfirmJobImportInput,
} from "@/features/job-import/schemas/job-import.schema";
import type { ExtractedJobData } from "@/features/job-import/types/job-import.types";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  APPLICATION_SOURCE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import type { Application } from "@/features/applications/types/application.types";
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

// react-hook-form's resolver needs the pre-parse (input) shape, distinct
// from ConfirmJobImportInput (the post-parse output) - confirmJobImportSchema
// coerces salary_min/salary_max to number (same reasoning ApplicationForm's
// own ApplicationFormValues type documents).
type JobImportReviewFormValues = z.input<typeof confirmJobImportSchema>;

interface JobImportReviewFormProps {
  extracted: ExtractedJobData;
  cvVersions: { id: string; name: string }[];
  onSuccess: (application: Application) => void;
  onCancel: () => void;
}

// IMPLEMENTATION_ORDER_V2.md Phase 32 (Smart Job Import), workflow step 6:
// "User reviews the extracted data" - every field is editable, pre-filled
// from `extracted` where a provider supplied a value (the Manual Provider
// supplies none, so the form simply starts blank). Deliberately its own
// component rather than reusing ApplicationForm: `company` here is free
// text (CompanyService.findOrCreateByName resolves it at confirm time), not
// a Select of already-existing companies, which ApplicationForm's schema
// and Company field both assume - a genuine shape difference, not
// duplication for its own sake. Every other field mirrors ApplicationForm's
// own fields/options/patterns exactly (same constants, same NONE_VALUE
// sentinel, same Controller usage) for visual and behavioural consistency.
export function JobImportReviewForm({
  extracted,
  cvVersions,
  onSuccess,
  onCancel,
}: JobImportReviewFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobImportReviewFormValues, unknown, ConfirmJobImportInput>({
    resolver: zodResolver(confirmJobImportSchema),
    defaultValues: {
      company: extracted.company ?? "",
      cv_version_id: "",
      position: extracted.position ?? "",
      application_date: "",
      job_url: extracted.job_url,
      location: extracted.location ?? "",
      work_mode: extracted.work_mode ?? undefined,
      employment_type: extracted.employment_type ?? undefined,
      salary_min: extracted.salary_min ?? undefined,
      salary_max: extracted.salary_max ?? undefined,
      currency: extracted.currency ?? "EUR",
      description: extracted.description ?? "",
    },
  });

  async function onSubmit(values: ConfirmJobImportInput) {
    const result = await confirmJobImportAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Application created.");
    onSuccess(result.data);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.company}>
          <FieldLabel htmlFor="company" required>
            Company
          </FieldLabel>
          <Input id="company" {...register("company")} />
          <FieldError errors={[errors.company]} />
        </Field>

        <Field data-invalid={!!errors.cv_version_id}>
          <FieldLabel htmlFor="cv_version_id" required>
            CV version
          </FieldLabel>
          <Controller
            name="cv_version_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="cv_version_id" className="w-full">
                  <SelectValue placeholder="Select a CV version" />
                </SelectTrigger>
                <SelectContent>
                  {cvVersions.map((cvVersion) => (
                    <SelectItem key={cvVersion.id} value={cvVersion.id}>
                      {cvVersion.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.cv_version_id]} />
        </Field>

        <Field data-invalid={!!errors.position}>
          <FieldLabel htmlFor="position" required>
            Position
          </FieldLabel>
          <Input id="position" {...register("position")} />
          <FieldError errors={[errors.position]} />
        </Field>

        <Field data-invalid={!!errors.application_date}>
          <FieldLabel htmlFor="application_date">Application date</FieldLabel>
          <Input
            id="application_date"
            type="date"
            {...register("application_date")}
          />
          <FieldError errors={[errors.application_date]} />
        </Field>

        <Field data-invalid={!!errors.location}>
          <FieldLabel htmlFor="location">Location</FieldLabel>
          <Input id="location" {...register("location")} />
          <FieldError errors={[errors.location]} />
        </Field>

        <Field data-invalid={!!errors.job_url}>
          <FieldLabel htmlFor="job_url">Job URL</FieldLabel>
          <Input id="job_url" {...register("job_url")} />
          <FieldError errors={[errors.job_url]} />
        </Field>

        <Field data-invalid={!!errors.work_mode}>
          <FieldLabel htmlFor="work_mode">Work mode</FieldLabel>
          <Controller
            name="work_mode"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="work_mode" className="w-full">
                  <SelectValue placeholder="Select work mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No preference</SelectItem>
                  {WORK_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.work_mode]} />
        </Field>

        <Field data-invalid={!!errors.employment_type}>
          <FieldLabel htmlFor="employment_type">Employment type</FieldLabel>
          <Controller
            name="employment_type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="employment_type" className="w-full">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No preference</SelectItem>
                  {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.employment_type]} />
        </Field>

        <Field data-invalid={!!errors.source}>
          <FieldLabel htmlFor="source">Source</FieldLabel>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="source" className="w-full">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No preference</SelectItem>
                  {APPLICATION_SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.source]} />
        </Field>

        <Field orientation="responsive" data-invalid={!!errors.salary_min}>
          <FieldLabel htmlFor="salary_min">Minimum salary</FieldLabel>
          <Input id="salary_min" type="number" {...register("salary_min")} />
          <FieldError errors={[errors.salary_min]} />
        </Field>

        <Field orientation="responsive" data-invalid={!!errors.salary_max}>
          <FieldLabel htmlFor="salary_max">Maximum salary</FieldLabel>
          <Input id="salary_max" type="number" {...register("salary_max")} />
          <FieldError errors={[errors.salary_max]} />
        </Field>

        <Field data-invalid={!!errors.currency}>
          <FieldLabel htmlFor="currency">Currency</FieldLabel>
          <Input id="currency" maxLength={3} {...register("currency")} />
          <FieldError errors={[errors.currency]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={5} {...register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create application
        </Button>
      </div>
    </form>
  );
}
