import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role client: bypasses RLS. Use only on the server or in trusted scripts
 * (e.g. `seed.ts`). Never import this from Client Components or expose the key in the browser.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(" and ")}. Add in Vercel → Project → Settings → Environment Variables, then Redeploy.`,
    );
  }

  return createClient<Database>(url!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
