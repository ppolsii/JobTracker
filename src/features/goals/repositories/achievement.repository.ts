import { createClient } from "@/lib/supabase/server";

// Only this module may query user_achievements (ADR-008). Achievements are
// unlocked automatically (AchievementService), never edited by the user -
// this Repository exposes only what that requires: read the unlocked set,
// insert a newly-earned one.
export const AchievementRepository = {
  async listUnlockedForUser(userId: string) {
    const supabase = await createClient();
    return supabase
      .from("user_achievements")
      .select("id, user_id, achievement_key, unlocked_at")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: true });
  },

  // Idempotent: the table's own unique(user_id, achievement_key) constraint
  // means a concurrent double-unlock attempt fails with 23505, which the
  // caller (AchievementService) treats as "already unlocked", not an error -
  // the same race-tolerant shape CompanyService.findOrCreateByName (Phase
  // 32) already established for a different table.
  async unlock(userId: string, achievementKey: string) {
    const supabase = await createClient();
    return supabase
      .from("user_achievements")
      .insert({ user_id: userId, achievement_key: achievementKey })
      .select("id, user_id, achievement_key, unlocked_at")
      .single();
  },
};
