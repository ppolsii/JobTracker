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
  SETTINGS: "/settings",
} as const;

// First dynamic route in the app (Phase 9's Application Detail page) - a
// small builder here avoids re-interpolating the same path shape at each
// call site (the table's "View" link, the status-change action's
// revalidatePath, the detail page's own back-link).
export function applicationDetailRoute(id: string): string {
  return `${ROUTES.APPLICATIONS}/${id}`;
}
