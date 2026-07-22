// IMPLEMENTATION_ORDER.md Phase 13: no documented result cap, so this
// mirrors the small, bounded-list convention already used across the
// codebase (e.g. Dashboard's RECENT_APPLICATIONS_LIMIT) - a header dropdown
// shows a handful of matches per entity, not a full paginated list.
export const SEARCH_RESULT_LIMIT = 5;

// IMPLEMENTATION_ORDER_V2.md Phase 27: the dedicated Search page's page
// size - matches the default page size every other paginated list page
// (Companies/CV Versions/Applications) already uses.
export const SEARCH_PAGE_LIMIT = 20;
