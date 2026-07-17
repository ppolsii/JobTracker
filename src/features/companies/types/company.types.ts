import type { Database } from "@/types/supabase";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
