import type { Database } from "@/types/supabase";

export type CVVersion = Database["public"]["Tables"]["cv_versions"]["Row"];
