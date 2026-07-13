import { supabase } from "./supabase";

let warmed = false;

/**
 * Fire one tiny query on app load so a cold (paused free-tier) database is
 * already awake by the time the user first needs it. The home page otherwise
 * makes no Supabase calls, so entering a group would be the session's first
 * DB hit and eat the full cold-start wake (~15–20s). Best-effort and cheap;
 * failures are ignored so a retry can warm it later.
 */
export function warmUpDatabase(): void {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  supabase
    .from("groups")
    .select("id")
    .limit(1)
    .then(
      () => {},
      () => {
        warmed = false;
      },
    );
}
