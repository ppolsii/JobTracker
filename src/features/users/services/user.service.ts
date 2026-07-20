import { UserRepository } from "@/features/users/repositories/user.repository";
import type { User } from "@/features/users/types/user.types";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// FEATURES.md Feature 2 "User Profile". Full Name is the only editable
// field (email changes require Supabase Auth's own confirmation flow and
// are not named in any phase's scope).
export const UserService = {
  async getProfile(userId: string): Promise<ActionResult<User>> {
    const { data, error } = await UserRepository.findById(userId);

    if (error || !data) {
      return {
        success: false,
        error: { message: "Profile not found.", code: ERROR_CODES.NOT_FOUND },
      };
    }

    return { success: true, data };
  },

  async updateProfile(
    userId: string,
    fullName: string
  ): Promise<ActionResult<User>> {
    const { data, error } = await UserRepository.update(userId, {
      full_name: fullName.trim(),
    });

    if (error || !data) {
      return {
        success: false,
        error: {
          message: "Something went wrong while updating your profile.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data };
  },
};
