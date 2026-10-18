/**
 * Where the app finds its server and database. The Supabase values are the
 * public (publishable) ones; override any of these with EXPO_PUBLIC_* in
 * .env.local (e.g. EXPO_PUBLIC_API_URL=http://localhost:3000 for local testing).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://guwahati-run.vercel.app").replace(/\/$/, "");
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://dcsqkvsctwlptkmgcwhl.supabase.co";
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || "sb_publishable_p2r_oaU-JgVK3XolHcm6qQ_lRSEDyal";
