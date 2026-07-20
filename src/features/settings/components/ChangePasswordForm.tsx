"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePasswordAction } from "@/features/auth/actions/auth.actions";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/features/auth/schemas/auth.schema";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

// Reuses the exact same schema and Server Action foundation as the
// forgot-password flow's UpdatePasswordForm (updatePasswordSchema,
// AuthService.updatePassword via changePasswordAction) - only the action
// wrapper differs, since this runs from an existing session rather than a
// recovery link.
export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: UpdatePasswordInput) {
    const result = await changePasswordAction(values);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Password updated.");
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password" required>
            New password
          </FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Update password
        </Button>
      </div>
    </form>
  );
}
