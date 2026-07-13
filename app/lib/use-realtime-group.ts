import { useEffect, useRef } from "react";

import { supabase } from "./supabase";

/**
 * Keeps the group page live: whenever a game belonging to this group changes
 * (new game, score update, deletion) or the group's members change, it calls
 * `onChange` — the page revalidates its loader. Coalesced so a burst of
 * updates triggers a single refetch.
 */
export function useRealtimeGroup(groupId: string, onChange: () => void): void {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ping = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 300);
    };

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `group_id=eq.${groupId}`,
        },
        ping,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`,
        },
        ping,
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [groupId]);
}
