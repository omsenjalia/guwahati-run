"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Browser client: publishable key + the team session from /api/session. */
let client: SupabaseClient | null = null;

export function browserDb() {
  if (client) return client;
  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "gr-sb-session" },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
}

/**
 * Unique Realtime channel name. supabase-js reuses a channel with the same
 * name, so two components listening to one table would otherwise share an
 * already-subscribed channel and crash.
 */
export function channelName(base: string) {
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
}
