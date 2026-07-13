import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen in .env gesetzt sein.",
  );
}

/**
 * One anonymous client for server and browser. There is no auth/session
 * state, so sharing it across SSR requests is safe; realtime only connects
 * once `.channel()` is used (browser only).
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
