import type { ErrorCode } from "@/shared/constants/error-codes";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: ErrorCode } };
