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
