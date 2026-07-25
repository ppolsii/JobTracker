import { describe, expect, it } from "vitest";

import { selectJobImportProvider } from "@/features/job-import/providers/select-job-import-provider";
import type { JobImportProvider } from "@/features/job-import/types/job-import.types";

function stubProvider(
  name: string,
  supports: (url: string) => boolean
): JobImportProvider {
  return {
    name,
    supports,
    extract: async (url) => ({
      company: null,
      position: null,
      location: null,
      work_mode: null,
      employment_type: null,
      salary_min: null,
      salary_max: null,
      currency: null,
      job_url: url,
      description: null,
    }),
  };
}

describe("selectJobImportProvider", () => {
  it("returns null when no provider supports the URL", () => {
    const providers = [stubProvider("linkedin", () => false)];

    expect(selectJobImportProvider("https://example.com/job/1", providers)).toBeNull();
  });

  it("returns the first matching provider when exactly one supports the URL", () => {
    const linkedin = stubProvider("linkedin", (url) => url.includes("linkedin.com"));
    const manual = stubProvider("manual", () => true);

    const result = selectJobImportProvider(
      "https://www.linkedin.com/jobs/view/123",
      [linkedin, manual]
    );

    expect(result?.name).toBe("linkedin");
  });

  it("respects registration order - the first match wins even if a later provider would also match", () => {
    const specific = stubProvider("specific", () => true);
    const fallback = stubProvider("fallback", () => true);

    const result = selectJobImportProvider("https://example.com", [
      specific,
      fallback,
    ]);

    expect(result?.name).toBe("specific");
  });

  it("falls back to a universal provider (e.g. Manual) placed last", () => {
    const linkedin = stubProvider("linkedin", (url) => url.includes("linkedin.com"));
    const manual = stubProvider("manual", () => true);

    const result = selectJobImportProvider(
      "https://careers.example.com/job/42",
      [linkedin, manual]
    );

    expect(result?.name).toBe("manual");
  });
});
