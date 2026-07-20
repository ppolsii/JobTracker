// PostgreSQL error codes referenced across Services when mapping database
// errors (e.g. from a partial unique index) to business errors. Generic
// Postgres codes, not part of this app's own ERROR_CODES taxonomy.
export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
} as const;
