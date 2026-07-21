/**
 * Resolve Supabase URL + public key for browser/server/proxy clients.
 * Prefers the publishable key; falls back to the legacy anon JWT.
 */
export function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(" and ")}. Add them in Vercel → Settings → Environment Variables (Production), then Redeploy.`,
    );
  }

  if (!supabaseUrl!.startsWith("https://") || !supabaseUrl!.includes("supabase.co")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL looks invalid ("${supabaseUrl}"). It should be like https://YOUR_PROJECT.supabase.co`,
    );
  }

  if (
    !supabaseKey!.startsWith("sb_publishable_") &&
    !supabaseKey!.startsWith("eyJ")
  ) {
    throw new Error(
      "Public Supabase key looks invalid. Use the sb_publishable_… value or the eyJ… anon key from .env.local — not a URL.",
    );
  }

  return { supabaseUrl: supabaseUrl!, supabaseKey: supabaseKey! };
}
