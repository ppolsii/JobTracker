"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Link from "next/link";
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
  applicationFormSchema,
  type ApplicationFormInput,
  type CreateApplicationInput,
} from "@/features/applications/schemas/application.schema";
import type { ApplicationWithRelations } from "@/features/applications/types/application.types";
import { LimitReachedDialog } from "@/features/billing/components/LimitReachedDialog";
import { CompanyCombobox } from "@/features/companies/components/CompanyCombobox";
import { ROUTES } from "@/config/routes";
import { ERROR_CODES } from "@/shared/constants/error-codes";
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
// from ApplicationFormInput (the post-parse output) - applicationFormSchema
// coerces `salary` to a number, and useForm's field-values generic must
// match what defaultValues/register actually hold before validation runs.
type ApplicationFormValues = z.input<typeof applicationFormSchema>;

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
  // archived, its name would otherwise be missing from the picker entirely
  // - the picker would show no selection even though company_id/
  // cv_version_id is still set. Post-MVP technical debt resolution: add the
  // application's current reference back as an extra option, scoped to
  // this form only - server-side validation (ApplicationService.
  // validateReferences) already independently rejects submitting any
  // archived reference, so this changes only what's visible, not what's
  // allowed. Held in state (not just derived) since Phase 40's inline
  // "create a company" combobox flow appends to this same list.
  const [companyOptions, setCompanyOptions] = useState(
    application?.companies &&
      !companies.some((company) => company.id === application.company_id)
      ? [
          ...companies,
          { id: application.company_id, name: application.companies.name },
        ]
      : companies
  );

  // Same KNOWN_ISSUES.md "Phase 8" reasoning as companyOptions above - just
  // a derived constant here, not state, since nothing adds to this list
  // inline anymore (IMPLEMENTATION_ORDER_V2.md Phase 40 follow-up "CV
  // SELECTION WORKFLOW": selecting an existing CV and creating one are
  // different actions and must not be mixed in the same control - CV
  // creation/upload now happens exclusively on the CV Versions page).
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
  } = useForm<ApplicationFormValues, unknown, ApplicationFormInput>({
    resolver: zodResolver(applicationFormSchema),
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
      // Phase 40 "SALARY": a single value pre-fills the unified field only
      // when there's no genuine range on file (min === max, or only one of
      // the two is set) - an existing range is left blank here rather than
      // guessed at, and only replaced once the user enters and saves a new
      // single value.
      salary:
        application?.salary_min != null &&
        (application?.salary_max == null ||
          application.salary_min === application.salary_max)
          ? application.salary_min
          : (application?.salary_max ?? undefined),
      currency: application?.currency ?? "EUR",
    },
  });

  // Phase 31.5 (Pro Plan Foundation): a FORBIDDEN result on *create* always
  // means the Free plan's active-application limit was reached (the only
  // rule ApplicationService.create enforces via
  // BillingService.requireApplicationCapacity) - shown as the Limit Reached
  // dialog instead of a plain toast. Editing an existing application never
  // hits this check, so `application` (truthy on edit) is excluded.
  const [limitReachedOpen, setLimitReachedOpen] = useState(false);

  async function onSubmit(values: ApplicationFormInput) {
    // Phase 40 "SALARY": the UI only offers one field, but the schema/
    // database still hold salary_min/salary_max separately (compatibility
    // with any existing range data and with Analytics) - a single entered
    // value is saved as an exact salary, min === max.
    const { salary, ...rest } = values;
    const payload: CreateApplicationInput = {
      ...rest,
      salary_min: salary,
      salary_max: salary,
    };

    const result = application
      ? await updateApplicationAction({ id: application.id, ...payload })
      : await createApplicationAction(payload);

    if (!result.success) {
      if (!application && result.error.code === ERROR_CODES.FORBIDDEN) {
        setLimitReachedOpen(true);
        return;
      }
      toast.error(result.error.message);
      return;
    }

    toast.success(
      application ? "Application updated." : "Application created."
    );
    onSuccess();
  }

  return (
    <>
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
                <CompanyCombobox
                  id="company_id"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={companyOptions}
                  onCreated={(company) =>
                    setCompanyOptions((prev) => [...prev, company])
                  }
                  aria-invalid={!!errors.company_id}
                />
              )}
            />
            <FieldError errors={[errors.company_id]} />
          </Field>

          <Field data-invalid={!!errors.cv_version_id}>
            <FieldLabel htmlFor="cv_version_id" required>
              CV version
            </FieldLabel>
            {cvVersionOptions.length === 0 ? (
              // IMPLEMENTATION_ORDER_V2.md Phase 40 follow-up "IF THERE ARE
              // NO CVS": a friendly empty state with a single CTA to the CV
              // Versions page, not an inline upload option and not another
              // modal - selecting a CV and creating one are different
              // actions (this follow-up's own "DESIGN PRINCIPLE"), and this
              // form's only job is to select one, not manage documents.
              <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">No CVs available.</p>
                <p className="text-sm text-muted-foreground">
                  You need at least one CV before creating an application.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={ROUTES.CV_VERSIONS} />}
                >
                  Open My CVs
                </Button>
              </div>
            ) : (
              <Controller
                name="cv_version_id"
                control={control}
                render={({ field }) => (
                  // Bug fix history for this Select:
                  // 1) `field.value` starts as `""` (never `undefined` - see
                  //    defaultValues above) and must stay that way here.
                  //    `value || undefined` used to turn that `""` into a
                  //    real `undefined` on the first render, which Base
                  //    UI's Select reads as "uncontrolled." `field.value ??
                  //    ""` is always a defined string, so the Select is
                  //    controlled from render one.
                  // 2) Being controlled was necessary but not sufficient:
                  //    Base UI's `Select.Value` only resolves a value to a
                  //    display label via the `items` array or
                  //    `itemToStringLabel` prop on `Select.Root` (confirmed
                  //    in its own source, resolveValueLabel.js) - without
                  //    either, it falls back to stringifying the raw
                  //    `value` itself. Since `SelectItem value={cvVersion.id}`
                  //    (the id) never equals its own displayed children
                  //    (the name), the trigger kept showing the raw id even
                  //    once properly controlled. `itemToStringLabel` below
                  //    closes that gap by looking the id up in the same
                  //    `cvVersionOptions` list the items are rendered from.
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    itemToStringLabel={(id: string) =>
                      cvVersionOptions.find((cvVersion) => cvVersion.id === id)
                        ?.name ?? id
                    }
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
            )}
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

          <Field orientation="responsive" data-invalid={!!errors.salary}>
            <FieldLabel htmlFor="salary">Salary (optional)</FieldLabel>
            <Input id="salary" type="number" {...register("salary")} />
            <FieldError errors={[errors.salary]} />
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
      <LimitReachedDialog
        open={limitReachedOpen}
        onOpenChange={setLimitReachedOpen}
      />
    </>
  );
}
