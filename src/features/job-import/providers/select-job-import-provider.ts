import type { JobImportProvider } from "@/features/job-import/types/job-import.types";

// IMPLEMENTATION_ORDER_V2.md Phase 32: "provider selection" split out of
// JobImportService as its own pure function - unit-testable (ordering,
// first-match-wins, the "no provider supports this URL" fallback) without
// mocking a Service or a Repository (CODE_STYLE.md "Testing": "Keep pure
// functions whenever possible").
export function selectJobImportProvider(
  url: string,
  providers: JobImportProvider[]
): JobImportProvider | null {
  return providers.find((provider) => provider.supports(url)) ?? null;
}
