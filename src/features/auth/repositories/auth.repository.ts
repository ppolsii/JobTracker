import { createClient } from "@/lib/supabase/server";

// Only this module may call supabase.auth.* (ADR-008). It always uses the
// server client: every mutation here runs through a Server Action, and the
// one operation that genuinely needs the browser session (completing a
// password recovery link) is handled client-side only to sync that session
// into cookies - the actual update still goes through this repository.
export const AuthRepository = {
  async signUp(email: string, password: string, fullName: string) {
    const supabase = await createClient();
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  },

  async signInWithPassword(email: string, password: string) {
    const supabase = await createClient();
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    const supabase = await createClient();
    return supabase.auth.signOut();
  },

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = await createClient();
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async updatePassword(password: string) {
    const supabase = await createClient();
    return supabase.auth.updateUser({ password });
  },

  async getUser() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
};
