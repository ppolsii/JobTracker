// IMPLEMENTATION_ORDER.md Phase 13: no documented result cap, so this
// mirrors the small, bounded-list convention already used across the
// codebase (e.g. Dashboard's RECENT_APPLICATIONS_LIMIT) - a header dropdown
// shows a handful of matches per entity, not a full paginated list.
export const SEARCH_RESULT_LIMIT = 5;
