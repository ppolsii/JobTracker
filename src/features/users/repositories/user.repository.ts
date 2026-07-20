import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

const USER_COLUMNS =
  "id, email, full_name, avatar_url, created_at, updated_at, deleted_at";

// Only this module may query the users table (ADR-008). This table has no
// separate user_id column - the row's own id IS the user, and RLS's
// "id = auth.uid()" policy is the real ownership enforcement - every query
// still filters by id explicitly, as defense in depth like every other
// repository in this codebase.
export const UserRepository = {
  async findById(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();
  },

  async update(userId: string, payload: UserUpdate) {
    const supabase = await createClient();
    return supabase
      .from("users")
      .update(payload)
      .eq("id", userId)
      .is("deleted_at", null)
      .select(USER_COLUMNS)
      .maybeSingle();
  },
};
