import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { getSupabasePublicEnv } from "@/utils/supabase/env";

export const createClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};
