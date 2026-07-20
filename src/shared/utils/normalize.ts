// Empty strings from untouched optional form fields become null, matching
// nullable DB columns (DATABASE.md) rather than storing empty strings.
// Feature-agnostic: shared by every feature with optional text fields.
export function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
