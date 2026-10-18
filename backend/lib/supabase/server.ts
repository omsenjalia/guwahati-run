import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret key (bypasses RLS).
 * Never import this from a "use client" file.
 */
let client: SupabaseClient | null = null;

export function serverDb() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
