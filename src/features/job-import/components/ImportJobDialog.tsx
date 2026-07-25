"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { UpgradeDialog } from "@/features/billing/components/UpgradeDialog";
import { extractJobDataAction } from "@/features/job-import/actions/job-import.actions";
import { JobImportReviewForm } from "@/features/job-import/components/JobImportReviewForm";
import {
  extractJobUrlSchema,
  type ExtractJobUrlInput,
} from "@/features/job-import/schemas/job-import.schema";
import type { ExtractedJobData } from "@/features/job-import/types/job-import.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

type ImportStep = "idle" | "loading" | "success" | "error";

const EMPTY_EXTRACTION: ExtractedJobData = {
  company: null,
  position: null,
  location: null,
  work_mode: null,
  employment_type: null,
  salary_min: null,
  salary_max: null,
  currency: null,
  job_url: "",
  description: null,
};

interface ImportJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cvVersions: { id: string; name: string }[];
}

// IMPLEMENTATION_ORDER_V2.md Phase 32 (Smart Job Import): the full workflow
// - paste URL, validate, detect provider, extract, review, confirm - as one
// controlled dialog with four states ("IMPORT DIALOG": Idle/Loading/
// Success/Failure). No provider-specific logic lives here or anywhere else
// in the UI - this component only calls JobImportService (via the Server
// Actions) and renders whatever ExtractedJobData comes back.
export function ImportJobDialog({
  open,
  onOpenChange,
  cvVersions,
}: ImportJobDialogProps) {
  const [step, setStep] = useState<ImportStep>("idle");
  const [extracted, setExtracted] =
    useState<ExtractedJobData>(EMPTY_EXTRACTION);
  const [errorMessage, setErrorMessage] = useState("");
  // "PRO SUPPORT": a FORBIDDEN result means Smart Job Import requires Pro -
  // reuses the exact same UpgradeDialog Export already uses, rather than a
  // second, duplicated "why go Pro" dialog.
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtractJobUrlInput>({
    resolver: zodResolver(extractJobUrlSchema),
    defaultValues: { url: "" },
  });

  function resetAndClose() {
    onOpenChange(false);
    setStep("idle");
    setExtracted(EMPTY_EXTRACTION);
    setErrorMessage("");
    reset();
  }

  async function onSubmitUrl(values: ExtractJobUrlInput) {
    setStep("loading");

    const result = await extractJobDataAction(values);

    if (!result.success) {
      if (result.error.code === ERROR_CODES.FORBIDDEN) {
        onOpenChange(false);
        setUpgradeDialogOpen(true);
        return;
      }
      setErrorMessage(result.error.message);
      setStep("error");
      return;
    }

    setExtracted(result.data);
    setStep("success");
  }

  // "FAILURE ... Allow manual completion." - the URL the user already typed
  // is preserved; every other field simply starts blank, same as the Manual
  // Provider's own extraction result.
  function continueManually() {
    setExtracted({ ...EMPTY_EXTRACTION, job_url: extracted.job_url });
    setStep("success");
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}
      >
        <DialogContent
          className={step === "success" ? "sm:max-w-lg" : undefined}
        >
          <DialogHeader>
            <DialogTitle>Import job</DialogTitle>
            <DialogDescription>
              {step === "success"
                ? "Review the details below, then create the application."
                : "Paste a job posting URL to get started."}
            </DialogDescription>
          </DialogHeader>

          {step === "idle" || step === "loading" ? (
            <form
              onSubmit={handleSubmit(onSubmitUrl)}
              noValidate
              className="flex flex-col gap-4"
            >
              <Field data-invalid={!!errors.url}>
                <FieldLabel htmlFor="job-import-url" required>
                  Job URL
                </FieldLabel>
                <Input
                  id="job-import-url"
                  placeholder="https://…"
                  disabled={step === "loading"}
                  {...register("url")}
                />
                <FieldError errors={[errors.url]} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAndClose}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={step === "loading"}>
                  {step === "loading" ? "Detecting provider…" : "Continue"}
                </Button>
              </div>
            </form>
          ) : null}

          {step === "error" ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("idle")}
                >
                  Try again
                </Button>
                <Button type="button" onClick={continueManually}>
                  Continue manually
                </Button>
              </div>
            </div>
          ) : null}

          {step === "success" ? (
            <JobImportReviewForm
              extracted={extracted}
              cvVersions={cvVersions}
              onSuccess={resetAndClose}
              onCancel={resetAndClose}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        featureName="Smart Job Import"
      />
    </>
  );
}
