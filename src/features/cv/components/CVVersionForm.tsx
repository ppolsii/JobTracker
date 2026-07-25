"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import {
  CV_FILE_MIME_TYPE,
  formatFileSize,
  validateCVFile,
} from "@/features/cv/utils/cv-file-validation";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldDescription,
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

// Phase 40 (CV Library): "each entry represents a real uploaded CV" - name/
// description still validate through react-hook-form + Zod exactly as
// before, but the PDF file itself is tracked as separate component state,
// not a form field. `File`/`FileList` don't survive react-hook-form's Zod
// resolver cleanly in this codebase's SSR-aware setup, and the file is only
// ever appended to FormData right before submission, never validated as
// part of the name/description schema.
export function CVVersionForm({
  cvVersion,
  onSuccess,
  onCancel,
}: CVVersionFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCVVersionInput>({
    resolver: zodResolver(createCVVersionSchema),
    defaultValues: {
      name: cvVersion?.name ?? "",
      description: cvVersion?.description ?? "",
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError("");
      return;
    }

    const validation = validateCVFile(selected);
    if (!validation.valid) {
      setFile(null);
      setFileError(validation.message);
      return;
    }

    setFile(selected);
    setFileError("");
  }

  async function onSubmit(values: CreateCVVersionInput) {
    if (!cvVersion && !file) {
      setFileError("Select a PDF file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("name", values.name);
    if (values.description) formData.append("description", values.description);
    if (cvVersion) formData.append("id", cvVersion.id);
    if (file) formData.append("file", file);

    setIsSubmitting(true);
    const result = cvVersion
      ? await updateCVVersionAction(formData)
      : await createCVVersionAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(cvVersion ? "CV version updated." : "CV version uploaded.");
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
        <Field data-invalid={!!fileError}>
          <FieldLabel htmlFor="file" required={!cvVersion}>
            {cvVersion ? "Replace PDF" : "PDF file"}
          </FieldLabel>
          {cvVersion?.file_name ? (
            <FieldDescription>
              Current file: {cvVersion.file_name}
              {cvVersion.file_size
                ? ` (${formatFileSize(cvVersion.file_size)})`
                : ""}
              . Choose a new file below to replace it.
            </FieldDescription>
          ) : null}
          <Input
            id="file"
            type="file"
            accept={CV_FILE_MIME_TYPE}
            onChange={handleFileChange}
          />
          {fileError ? (
            <p className="text-sm text-destructive">{fileError}</p>
          ) : null}
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {cvVersion ? "Save changes" : "Upload CV"}
        </Button>
      </div>
    </form>
  );
}
