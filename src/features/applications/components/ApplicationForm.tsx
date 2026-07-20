"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import {
  createApplicationAction,
  updateApplicationAction,
} from "@/features/applications/actions/application.actions";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  APPLICATION_SOURCE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/features/applications/constants/application.constants";
import {
  createApplicationSchema,
  type CreateApplicationInput,
} from "@/features/applications/schemas/application.schema";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
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

const NONE_VALUE = "__none__";

// react-hook-form's resolver needs the pre-parse (input) shape here, distinct
// from CreateApplicationInput (the post-parse output) - createApplicationSchema
// coerces salary_min/salary_max to number, and useForm's field-values generic
// must match what defaultValues/register actually hold before validation runs.
type ApplicationFormValues = z.input<typeof createApplicationSchema>;

interface ApplicationFormProps {
  application?: ApplicationWithRelations;
  companies: { id: string; name: string }[];
  cvVersions: { id: string; name: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationForm({
  application,
  companies,
  cvVersions,
  onSuccess,
  onCancel,
}: ApplicationFormProps) {
  // KNOWN_ISSUES.md "Phase 8": `companies`/`cvVersions` (correctly) list
  // only active rows, so if this application's own reference has since been
  // archived, its name would otherwise be missing from the Select entirely
  // - the picker would show no selection even though company_id/
  // cv_version_id is still set. Post-MVP technical debt resolution: add the
  // application's current reference back as an extra option, scoped to
  // this form only - server-side validation (ApplicationService.
  // validateReferences) already independently rejects submitting any
  // archived reference, so this changes only what's visible, not what's
  // allowed.
  const companyOptions =
    application?.companies &&
    !companies.some((company) => company.id === application.company_id)
      ? [
          ...companies,
          { id: application.company_id, name: application.companies.name },
        ]
      : companies;

  const cvVersionOptions =
    application?.cv_versions &&
    !cvVersions.some((cvVersion) => cvVersion.id === application.cv_version_id)
      ? [
          ...cvVersions,
          { id: application.cv_version_id, name: application.cv_versions.name },
        ]
      : cvVersions;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      company_id: application?.company_id ?? "",
      cv_version_id: application?.cv_version_id ?? "",
      position: application?.position ?? "",
      application_date: application?.application_date ?? "",
      job_url: application?.job_url ?? "",
      location: application?.location ?? "",
      work_mode: application?.work_mode ?? undefined,
      employment_type: application?.employment_type ?? undefined,
      source: application?.source ?? undefined,
      salary_min: application?.salary_min ?? undefined,
      salary_max: application?.salary_max ?? undefined,
      currency: application?.currency ?? "EUR",
    },
  });

  async function onSubmit(values: CreateApplicationInput) {
    const result = application
      ? await updateApplicationAction({ id: application.id, ...values })
      : await createApplicationAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(
      application ? "Application updated." : "Application created."
    );
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.company_id}>
          <FieldLabel htmlFor="company_id" required>
            Company
          </FieldLabel>
          <Controller
            name="company_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="company_id" className="w-full">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.company_id]} />
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
                  {cvVersionOptions.map((cvVersion) => (
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
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {application ? "Save changes" : "Create application"}
        </Button>
      </div>
    </form>
  );
}
