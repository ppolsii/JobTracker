"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createCompanyAction,
  updateCompanyAction,
} from "@/features/companies/actions/company.actions";
import {
  createCompanySchema,
  type CreateCompanyInput,
} from "@/features/companies/schemas/company.schema";
import type { Company } from "@/features/companies/types/company.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

interface CompanyFormProps {
  company?: Company;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: company?.name ?? "",
      website: company?.website ?? "",
      industry: company?.industry ?? "",
      size: company?.size ?? "",
      country: company?.country ?? "",
      city: company?.city ?? "",
    },
  });

  async function onSubmit(values: CreateCompanyInput) {
    const result = company
      ? await updateCompanyAction({ id: company.id, ...values })
      : await createCompanyAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(company ? "Company updated." : "Company created.");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name" required>
            Company name
          </FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.website}>
          <FieldLabel htmlFor="website">Website</FieldLabel>
          <Input id="website" {...register("website")} />
          <FieldError errors={[errors.website]} />
        </Field>
        <Field data-invalid={!!errors.industry}>
          <FieldLabel htmlFor="industry">Industry</FieldLabel>
          <Input id="industry" {...register("industry")} />
          <FieldError errors={[errors.industry]} />
        </Field>
        <Field data-invalid={!!errors.size}>
          <FieldLabel htmlFor="size">Company size</FieldLabel>
          <Input id="size" {...register("size")} />
          <FieldError errors={[errors.size]} />
        </Field>
        <Field data-invalid={!!errors.country}>
          <FieldLabel htmlFor="country">Country</FieldLabel>
          <Input id="country" {...register("country")} />
          <FieldError errors={[errors.country]} />
        </Field>
        <Field data-invalid={!!errors.city}>
          <FieldLabel htmlFor="city">City</FieldLabel>
          <Input id="city" {...register("city")} />
          <FieldError errors={[errors.city]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {company ? "Save changes" : "Create company"}
        </Button>
      </div>
    </form>
  );
}
