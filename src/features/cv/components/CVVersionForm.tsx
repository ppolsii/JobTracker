"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createCVVersionAction,
  updateCVVersionAction,
} from "@/features/cv/actions/cv-version.actions";
import {
  createCVVersionSchema,
  type CreateCVVersionInput,
} from "@/features/cv/schemas/cv-version.schema";
import type { CVVersion } from "@/features/cv/types/cv-version.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

interface CVVersionFormProps {
  cvVersion?: CVVersion;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CVVersionForm({
  cvVersion,
  onSuccess,
  onCancel,
}: CVVersionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCVVersionInput>({
    resolver: zodResolver(createCVVersionSchema),
    defaultValues: {
      name: cvVersion?.name ?? "",
      description: cvVersion?.description ?? "",
    },
  });

  async function onSubmit(values: CreateCVVersionInput) {
    const result = cvVersion
      ? await updateCVVersionAction({ id: cvVersion.id, ...values })
      : await createCVVersionAction(values);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(cvVersion ? "CV version updated." : "CV version created.");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name" required>
            CV name
          </FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" {...register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {cvVersion ? "Save changes" : "Create CV version"}
        </Button>
      </div>
    </form>
  );
}
