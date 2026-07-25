import { describe, expect, it } from "vitest";

import {
  MAX_CV_FILE_SIZE_BYTES,
  formatFileSize,
  validateCVFile,
} from "@/features/cv/utils/cv-file-validation";

describe("validateCVFile", () => {
  it("accepts a PDF within the size limit", () => {
    const result = validateCVFile({ type: "application/pdf", size: 1024 });
    expect(result).toEqual({ valid: true });
  });

  it("rejects a non-PDF file", () => {
    const result = validateCVFile({
      type: "application/msword",
      size: 1024,
    });
    expect(result).toEqual({
      valid: false,
      message: "Only PDF files are supported.",
    });
  });

  it("rejects an empty file", () => {
    const result = validateCVFile({ type: "application/pdf", size: 0 });
    expect(result.valid).toBe(false);
  });

  it("rejects a file over the maximum size", () => {
    const result = validateCVFile({
      type: "application/pdf",
      size: MAX_CV_FILE_SIZE_BYTES + 1,
    });
    expect(result).toEqual({
      valid: false,
      message: "The file is too large. The maximum size is 5 MB.",
    });
  });

  it("accepts a file exactly at the maximum size", () => {
    const result = validateCVFile({
      type: "application/pdf",
      size: MAX_CV_FILE_SIZE_BYTES,
    });
    expect(result.valid).toBe(true);
  });
});

describe("formatFileSize", () => {
  it("formats bytes under 1KB", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
