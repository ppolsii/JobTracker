"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfileAction } from "@/features/users/actions/user.actions";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/features/users/schemas/user.schema";
import type { User } from "@/features/users/types/user.types";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

// FEATURES.md Feature 2 "User Profile": "Editable Fields: Full Name."
// Email is displayed but not editable - changing it isn't documented as in
// scope for any phase (it requires Supabase Auth's own confirmation flow).
export function ProfileForm({ user }: { user: User }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: user.full_name },
  });

  async function onSubmit(values: UpdateProfileInput) {
    const result = await updateProfileAction(values);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Profile updated.");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={user.email} disabled />
        </Field>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName" required>
            Full name
          </FieldLabel>
          <Input id="fullName" {...register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
