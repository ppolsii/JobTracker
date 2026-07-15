import { createClient } from "@/lib/supabase/client";

// Client-side counterpart to AuthRepository (ADR-008: only Repository
// modules may call supabase.auth.*). Needed because a password-recovery or
// email-confirmation session is only visible in the URL hash fragment,
// which the server never sees - only the browser client can process it.
export const AuthBrowserRepository = {
  async getSession() {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  // Merely instantiating the browser client triggers its built-in
  // detection and cookie-sync of any session encoded in the current URL.
  syncSessionFromUrl() {
    createClient();
  },
};
