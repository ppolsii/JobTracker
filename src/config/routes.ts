export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  UPDATE_PASSWORD: "/update-password",
  DASHBOARD: "/dashboard",
  // Not implemented yet - each is built in its own later phase. Defined now
  // so the Phase 5 navigation shell has somewhere to point.
  APPLICATIONS: "/applications",
  COMPANIES: "/companies",
  CV_VERSIONS: "/cv-versions",
  ANALYTICS: "/analytics",
  // IMPLEMENTATION_ORDER_V2.md Phase 33: a separate page, not a replacement
  // for ANALYTICS above - reached via a link from it, not a sidebar item of
  // its own (mirrors SEARCH's precedent below).
  ANALYTICS_ADVANCED: "/analytics/advanced",
  SETTINGS: "/settings",
  // IMPLEMENTATION_ORDER_V2.md Phase 27: the dedicated Search results page,
  // reached from GlobalSearch's "view all results" link - not a sidebar
  // item (UI_SYSTEM.md's Sidebar list is unchanged).
  SEARCH: "/search",
  // Phase 31.5 (Pro Plan Foundation): unlike Search, this IS a sidebar item.
  PRICING: "/pricing",
  // IMPLEMENTATION_ORDER_V2.md Phase 34: "Accessible from the main
  // navigation" - a sidebar item, unlike ANALYTICS_ADVANCED above.
  CALENDAR: "/calendar",
  // IMPLEMENTATION_ORDER_V2.md Phase 35: "Add it to the navigation" - a
  // sidebar item, same as Calendar above.
  GOALS: "/goals",
  // IMPLEMENTATION_ORDER_V2.md Phase 36: reached via the nav bell icon
  // (TopNav), not a sidebar item - mirrors Search's own precedent (a
  // dedicated page reached from a top-nav affordance, not the sidebar).
  NOTIFICATIONS: "/notifications",
  // IMPLEMENTATION_ORDER_V2.md Phase 37 (Landing Page & Marketing Website).
  // Public, unauthenticated pages - HOME above is reused as the marketing
  // homepage (it already redirects a signed-in visitor to DASHBOARD).
  // PLANS (not PRICING): the dashboard already owns "/pricing" as a
  // logged-in-only page (Phase 31.5) - Next.js cannot resolve two different
  // pages to the same path, and that page is explicitly out of scope this
  // phase ("does not modify the dashboard application"), so the public
  // pricing page lives at a different path instead.
  FEATURES: "/features",
  PLANS: "/plans",
  ABOUT: "/about",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/terms",
} as const;

// First dynamic route in the app (Phase 9's Application Detail page) - a
// small builder here avoids re-interpolating the same path shape at each
// call site (the table's "View" link, the status-change action's
// revalidatePath, the detail page's own back-link).
export function applicationDetailRoute(id: string): string {
  return `${ROUTES.APPLICATIONS}/${id}`;
}
