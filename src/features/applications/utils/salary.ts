// IMPLEMENTATION_ORDER_V2.md Phase 40 "SALARY": the UI now presents a single
// "Salary" field, but salary_min/salary_max remain the underlying columns
// (compatibility with any existing range data, and with Analytics'
// calculations, which still read both). A value entered through the new
// single field is saved as salary_min === salary_max; this only collapses a
// genuine pre-existing range down to one number when that application is
// next edited and saved through this form, never silently in the background.
export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min === max) {
    return `${min} ${currency}`;
  }
  return `${min ?? "?"}–${max ?? "?"} ${currency}`;
}
