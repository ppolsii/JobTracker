import { describe, expect, it } from "vitest";

import { ManualJobImportProvider } from "@/features/job-import/providers/manual.provider";

describe("ManualJobImportProvider", () => {
  it("supports every URL, since it is the universal fallback", () => {
    expect(ManualJobImportProvider.supports("https://example.com/job/1")).toBe(
      true
    );
    expect(ManualJobImportProvider.supports("not-even-a-url")).toBe(true);
  });

  it("extracts nothing but the URL itself - no scraping, no external calls", async () => {
    const result = await ManualJobImportProvider.extract(
      "https://example.com/job/1"
    );

    expect(result).toEqual({
      company: null,
      position: null,
      location: null,
      work_mode: null,
      employment_type: null,
      salary_min: null,
      salary_max: null,
      currency: null,
      job_url: "https://example.com/job/1",
      description: null,
    });
  });
});
