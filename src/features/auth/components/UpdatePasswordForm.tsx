"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { updatePasswordAction } from "@/features/auth/actions/auth.actions";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/features/auth/schemas/auth.schema";
import { AuthBrowserService } from "@/features/auth/services/auth-browser.service";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

export function UpdatePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    // The recovery link lands the browser on this page with the session
    // encoded in the URL. AuthBrowserService processes and syncs it to
    // cookies, so the Server Action below can use it via the server client.
    AuthBrowserService.hasRecoverySession().then(setSessionReady);
  }, []);

  async function onSubmit(values: UpdatePasswordInput) {
    setFormError(null);
    const result = await updatePasswordAction(values);
    if (result && !result.success) {
      setFormError(result.error.message);
    }
  }

  if (sessionReady === false) {
    return (
      <p className="text-sm text-muted-foreground">
        This reset link is invalid or has expired. Please request a new one.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={sessionReady !== true || isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
