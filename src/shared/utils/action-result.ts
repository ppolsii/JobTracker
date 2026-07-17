import { ERROR_CODES } from "@/shared/constants/error-codes";
import type { ActionResult } from "@/types/action-result";

// Generic, feature-agnostic - every Server Action across every feature
// needs to turn a failed Zod parse into the same ActionResult shape.
export function validationError(message: string): ActionResult<never> {
  return {
    success: false,
    error: { message, code: ERROR_CODES.VALIDATION_ERROR },
  };
}
