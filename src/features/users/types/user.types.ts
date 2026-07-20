import type { Database } from "@/types/supabase";

export type User = Database["public"]["Tables"]["users"]["Row"];
