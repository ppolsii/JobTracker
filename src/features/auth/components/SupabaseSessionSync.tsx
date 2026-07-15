"use client";

import { useEffect } from "react";

import { AuthBrowserService } from "@/features/auth/services/auth-browser.service";

// A signup-confirmation link can land on any page (Supabase redirects to the
// project's configured Site URL, not necessarily /update-password), with the
// session encoded in the URL hash. Mounted once in the root layout, this
// ensures that hash is always processed and synced to cookies, regardless of
// which page it lands on. Renders nothing; this is a side-effect-only
// component.
export function SupabaseSessionSync() {
  useEffect(() => {
    AuthBrowserService.syncSessionFromUrl();
  }, []);

  return null;
}
