import { useEffect, useRef, useState } from "react";

import { fetchGameById } from "./game-api";
import { supabase } from "./supabase";
import type { GameRow } from "./types";

/**
 * Takes the SSR-loaded row and keeps it live:
 * - subscribes to postgres_changes UPDATEs for this row
 * - refetches once on SUBSCRIBED (covers the gap between SSR snapshot and
 *   subscription start) and again after reconnects / tab foregrounding
 * - ignores payloads older than what we already show
 */
export function useRealtimeGame(initial: GameRow): GameRow {
  const [game, setGame] = useState(initial);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    setGame(initial);
  }, [initial.id]);

  useEffect(() => {
    const id = initial.id;

    const apply = (row: GameRow | null) => {
      if (!row) return;
      if (row.updated_at < gameRef.current.updated_at) return;
      setGame(row);
    };

    const refetch = () => {
      fetchGameById(id).then(apply, () => {});
    };

    const channel = supabase
      .channel(`game:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${id}`,
        },
        (payload) => apply(payload.new as GameRow),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refetch();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [initial.id]);

  return game;
}
