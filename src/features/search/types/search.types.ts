// API.md "Search": "Searches Companies, Applications, Notes." One lean row
// shape per entity - just enough to render a result and link back to that
// entity's existing page, not the full domain object (ANALYTICS_ENGINE.md's
// "avoid loading unnecessary records" principle applies equally here).
export interface CompanySearchResult {
  id: string;
  name: string;
}

export interface ApplicationSearchResult {
  id: string;
  position: string;
  companyName: string | null;
}

export interface NoteSearchResult {
  id: string;
  applicationId: string;
  content: string;
  applicationPosition: string | null;
}

export interface SearchResults {
  companies: CompanySearchResult[];
  // IMPLEMENTATION_ORDER_V2.md Phase 27: totals, additive to the existing
  // array fields above - GlobalSearch's dropdown ignores them; the
  // dedicated Search page uses them to render PaginationControls.
  companiesTotal: number;
  applications: ApplicationSearchResult[];
  applicationsTotal: number;
  notes: NoteSearchResult[];
  notesTotal: number;
}
