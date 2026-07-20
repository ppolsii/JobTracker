import { z } from "zod";

// FEATURES.md Feature 2 "User Profile": "Editable Fields: Full Name." Same
// field, same rule as registerSchema's fullName (auth.schema.ts) - this is
// the same logical field being edited post-registration, not a new rule.
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
