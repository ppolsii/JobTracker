import { describe, expect, it, vi } from "vitest";

import { CVVersionRepository } from "@/features/cv/repositories/cv-version.repository";
import { CVVersionService } from "@/features/cv/services/cv-version.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { POSTGRES_ERROR_CODES } from "@/shared/constants/postgres-error-codes";

// Repository is mocked at the module boundary - same convention as
// company.service.test.ts (CVVersionService is the unit under test, the
// Repository is a trusted, already-covered seam).
vi.mock("@/features/cv/repositories/cv-version.repository", () => ({
  CVVersionRepository: {
    findActiveByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    countActiveApplications: vi.fn(),
    list: vi.fn(),
    uploadFile: vi.fn(),
    removeFile: vi.fn(),
    findFileById: vi.fn(),
    createSignedDownloadUrl: vi.fn(),
  },
}));

const mockedRepository = vi.mocked(CVVersionRepository);

function pdfFile(overrides: Partial<{ name: string; size: number }> = {}) {
  return new File(["%PDF-1.4"], overrides.name ?? "resume.pdf", {
    type: "application/pdf",
  });
}

describe("CVVersionService.create", () => {
  it("rejects a duplicate name before ever uploading anything", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: { id: "existing-id" },
      error: null,
    } as never);

    const result = await CVVersionService.create(
      "user-1",
      { name: "Backend" },
      pdfFile()
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
    expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("rejects a non-PDF file without uploading or creating a row", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const notPdf = new File(["hi"], "resume.docx", {
      type: "application/msword",
    });

    const result = await CVVersionService.create(
      "user-1",
      { name: "Backend" },
      notPdf
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("uploads the file first, then creates the row referencing it", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.uploadFile.mockResolvedValue({
      path: "user-1/some-id.pdf",
      error: null,
    } as never);
    mockedRepository.create.mockResolvedValue({
      data: { id: "new-id", name: "Backend" },
      error: null,
    } as never);

    const result = await CVVersionService.create(
      "user-1",
      { name: "Backend" },
      pdfFile()
    );

    expect(result.success).toBe(true);
    expect(mockedRepository.uploadFile).toHaveBeenCalled();
    expect(mockedRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Backend",
        file_path: "user-1/some-id.pdf",
        file_name: "resume.pdf",
      })
    );
    expect(mockedRepository.removeFile).not.toHaveBeenCalled();
  });

  it("reports an upload failure without ever creating a row", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.uploadFile.mockResolvedValue({
      path: "user-1/some-id.pdf",
      error: { message: "storage down" },
    } as never);

    const result = await CVVersionService.create(
      "user-1",
      { name: "Backend" },
      pdfFile()
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
    expect(mockedRepository.create).not.toHaveBeenCalled();
  });

  it("cleans up the just-uploaded file when the row insert hits a duplicate-name race", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.uploadFile.mockResolvedValue({
      path: "user-1/some-id.pdf",
      error: null,
    } as never);
    mockedRepository.create.mockResolvedValue({
      data: null,
      error: { code: POSTGRES_ERROR_CODES.UNIQUE_VIOLATION },
    } as never);

    const result = await CVVersionService.create(
      "user-1",
      { name: "Backend" },
      pdfFile()
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
    expect(mockedRepository.removeFile).toHaveBeenCalledWith(
      "user-1/some-id.pdf"
    );
  });
});

describe("CVVersionService.update", () => {
  it("updates name/description without touching storage when no file is given", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.update.mockResolvedValue({
      data: { id: "cv-1", name: "Backend v2" },
      error: null,
    } as never);

    const result = await CVVersionService.update("user-1", "cv-1", {
      name: "Backend v2",
    });

    expect(result.success).toBe(true);
    expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    expect(mockedRepository.update).toHaveBeenCalledWith(
      "user-1",
      "cv-1",
      expect.not.objectContaining({ file_path: expect.anything() })
    );
  });

  it("replaces the file in place when one is given", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);
    mockedRepository.uploadFile.mockResolvedValue({
      path: "user-1/cv-1.pdf",
      error: null,
    } as never);
    mockedRepository.update.mockResolvedValue({
      data: { id: "cv-1", name: "Backend v2" },
      error: null,
    } as never);

    const result = await CVVersionService.update(
      "user-1",
      "cv-1",
      { name: "Backend v2" },
      pdfFile({ name: "resume-v2.pdf" })
    );

    expect(result.success).toBe(true);
    expect(mockedRepository.uploadFile).toHaveBeenCalledWith(
      "user-1",
      "cv-1",
      expect.anything()
    );
    expect(mockedRepository.update).toHaveBeenCalledWith(
      "user-1",
      "cv-1",
      expect.objectContaining({
        file_path: "user-1/cv-1.pdf",
        file_name: "resume-v2.pdf",
      })
    );
  });

  it("rejects a replacement file that isn't a PDF, before touching storage", async () => {
    mockedRepository.findActiveByName.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const notPdf = new File(["hi"], "resume.docx", {
      type: "application/msword",
    });

    const result = await CVVersionService.update(
      "user-1",
      "cv-1",
      { name: "Backend v2" },
      notPdf
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    expect(mockedRepository.update).not.toHaveBeenCalled();
  });
});

describe("CVVersionService.getDownloadUrl", () => {
  it("returns NOT_FOUND when the row doesn't exist", async () => {
    mockedRepository.findFileById.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await CVVersionService.getDownloadUrl("user-1", "cv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns NOT_FOUND when the row has no uploaded file yet (a legacy, pre-Phase-40 CV version)", async () => {
    mockedRepository.findFileById.mockResolvedValue({
      data: { file_path: null, file_name: null },
      error: null,
    } as never);

    const result = await CVVersionService.getDownloadUrl("user-1", "cv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("no uploaded file");
    }
  });

  it("mints a signed URL for a CV version with a file", async () => {
    mockedRepository.findFileById.mockResolvedValue({
      data: { file_path: "user-1/cv-1.pdf", file_name: "resume.pdf" },
      error: null,
    } as never);
    mockedRepository.createSignedDownloadUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/resume.pdf" },
      error: null,
    } as never);

    const result = await CVVersionService.getDownloadUrl("user-1", "cv-1");

    expect(result).toEqual({
      success: true,
      data: {
        url: "https://signed.example/resume.pdf",
        fileName: "resume.pdf",
      },
    });
  });
});
