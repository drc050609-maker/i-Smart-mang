import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add both in Vercel → Settings → Environment Variables, then redeploy.",
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};
