// IMPLEMENTATION_ORDER_V2.md Phase 40 (CV Library): matches the storage
// bucket's own constraints (see the `cv-files` bucket definition in
// supabase/migrations/20260726090000_cv_file_storage.sql) so a rejected
// upload is caught here, with a friendly message, before ever reaching
// Supabase Storage.
export const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const CV_FILE_MIME_TYPE = "application/pdf";

export type CVFileValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateCVFile(file: {
  type: string;
  size: number;
}): CVFileValidationResult {
  if (file.type !== CV_FILE_MIME_TYPE) {
    return { valid: false, message: "Only PDF files are supported." };
  }

  if (file.size <= 0) {
    return { valid: false, message: "The selected file is empty." };
  }

  if (file.size > MAX_CV_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: "The file is too large. The maximum size is 5 MB.",
    };
  }

  return { valid: true };
}

// Formats a byte count for display next to an uploaded CV (e.g. "1.2 MB").
// Deliberately simple - CV files are always well under a gigabyte, so only
// bytes/KB/MB are handled.
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
