import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// Translates raw Supabase Auth errors into the meaningful, non-leaking
// messages BUSINESS_RULES.md requires ("Error Handling").
function toFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (lower.includes("email address") && lower.includes("invalid")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("session")) {
    return "Your session has expired. Please request a new link.";
  }

  return "Something went wrong. Please try again.";
}

export const AuthService = {
  async register(input: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<ActionResult<{ requiresEmailConfirmation: boolean }>> {
    const { data, error } = await AuthRepository.signUp(
      input.email,
      input.password,
      input.fullName
    );

    if (error) {
      return {
        success: false,
        error: {
          message: toFriendlyAuthError(error.message),
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      };
    }

    // Supabase never errors on a duplicate email (to avoid account
    // enumeration); an empty identities array is its documented signal that
    // no new account was actually created.
    if (data.user?.identities?.length === 0) {
      return {
        success: false,
        error: {
          message: "An account with this email already exists.",
          code: ERROR_CODES.CONFLICT,
        },
      };
    }

    return {
      success: true,
      data: { requiresEmailConfirmation: data.session === null },
    };
  },

  async login(input: { email: string; password: string }): Promise<ActionResult> {
    const { error } = await AuthRepository.signInWithPassword(
      input.email,
      input.password
    );

    if (error) {
      return {
        success: false,
        error: {
          message: toFriendlyAuthError(error.message),
          code: ERROR_CODES.UNAUTHENTICATED,
        },
      };
    }

    return { success: true, data: undefined };
  },

  async logout(): Promise<ActionResult> {
    const { error } = await AuthRepository.signOut();

    if (error) {
      return {
        success: false,
        error: {
          message: "Something went wrong while signing out.",
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      };
    }

    return { success: true, data: undefined };
  },

  async requestPasswordReset(
    email: string,
    redirectTo: string
  ): Promise<ActionResult> {
    // Supabase never reveals whether the email exists, to avoid account
    // enumeration - the response is always the same regardless of outcome.
    await AuthRepository.resetPasswordForEmail(email, redirectTo);
    return { success: true, data: undefined };
  },

  async updatePassword(password: string): Promise<ActionResult> {
    const { error } = await AuthRepository.updatePassword(password);

    if (error) {
      return {
        success: false,
        error: {
          message: toFriendlyAuthError(error.message),
          code: ERROR_CODES.UNAUTHENTICATED,
        },
      };
    }

    return { success: true, data: undefined };
  },

  async getCurrentUser() {
    return AuthRepository.getUser();
  },
};
