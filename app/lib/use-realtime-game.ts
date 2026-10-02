import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchGameById,
  mergePlayer,
  mergeStateAt,
  setStateAt,
  updateGame,
} from "./game-api";
import {
  applyOps,
  compareTimestamps,
  type GameOp,
  type GamePatch,
} from "./optimistic";
import { supabase } from "./supabase";
import type { GameRow, Json, Player } from "./types";

export type SyncStatus = "synced" | "saving" | "retrying" | "error";

export interface GameActions {
  setStateAt: (path: string[], value: Json | null) => Promise<void>;
  mergeStateAt: (path: string[], value: Record<string, Json | null>) => Promise<void>;
  mergePlayer: (
    playerId: string,
    patch: Partial<Pick<Player, "name" | "color">>,
  ) => Promise<void>;
  update: (patch: GamePatch) => Promise<void>;
}

interface Pending {
  id: number;
  op: GameOp;
}

const RETRY_DELAYS = [600, 1500, 3000, 6000, 10000];

/** Network failures carry no Postgres error code; those are worth retrying. */
function isTransient(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !code;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function send(gameId: string, op: GameOp): Promise<GameRow | null> {
  switch (op.kind) {
    case "set":
      return setStateAt(gameId, op.path, op.value);
    case "merge":
      return mergeStateAt(gameId, op.path, op.value);
    case "player":
      return mergePlayer(gameId, op.playerId, op.patch);
    case "update":
      return updateGame(gameId, op.patch);
  }
}

/**
 * Takes the SSR-loaded row and keeps it live, with every local write applied
 * optimistically:
 * - writes go into a pending queue that is overlaid on the server row, so
 *   input shows instantly and never flickers back while in flight
 * - the queue is sent in order; each write is confirmed by the row the
 *   server returns (or a refetch), and only then dropped from the overlay —
 *   in the same render that applies the confirming row
 * - network failures are retried with backoff while the value stays visible
 * - postgres_changes UPDATEs keep other devices' writes live; payloads older
 *   than what we show are dropped; we refetch on SUBSCRIBED, reconnect and
 *   tab re-focus
 */
export function useRealtimeGame(initial: GameRow) {
  const [server, setServer] = useState(initial);
  const serverRef = useRef(server);
  const [pending, setPending] = useState<Pending[]>([]);
  const [status, setStatus] = useState<SyncStatus>("synced");
  const nextId = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const inFlight = useRef(0);

  useEffect(() => {
    serverRef.current = initial;
    setServer(initial);
    setPending([]);
  }, [initial.id]);

  const acceptRow = useCallback((row: GameRow | null) => {
    if (!row || row.id !== serverRef.current.id) return;
    if (compareTimestamps(row.updated_at, serverRef.current.updated_at) < 0) return;
    serverRef.current = row;
    setServer(row);
  }, []);

  useEffect(() => {
    const id = initial.id;
    const refetch = () => {
      fetchGameById(id).then(acceptRow, () => {});
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
        (payload) => {
          // Oversized rows arrive without their columns — fetch instead.
          const row = payload.new as Partial<GameRow>;
          if (row.state && row.players && row.updated_at) acceptRow(row as GameRow);
          else refetch();
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") refetch();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refetch);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refetch);
      supabase.removeChannel(channel);
    };
  }, [initial.id, acceptRow]);

  const write = useCallback(
    (op: GameOp): Promise<void> => {
      const id = nextId.current++;
      const gameId = serverRef.current.id;
      setPending((prev) => [...prev, { id, op }]);
      inFlight.current++;
      setStatus("saving");

      const drop = () => setPending((prev) => prev.filter((p) => p.id !== id));
      const run = async () => {
        for (let attempt = 0; ; attempt++) {
          try {
            const row = (await send(gameId, op)) ?? (await fetchGameById(gameId));
            // Both updates land in one render: the confirming row replaces
            // the overlay without a frame in between.
            acceptRow(row);
            drop();
            return;
          } catch (error) {
            if (!isTransient(error) || attempt >= RETRY_DELAYS.length) {
              drop();
              throw error;
            }
            setStatus("retrying");
            await wait(RETRY_DELAYS[attempt]);
          }
        }
      };

      const result = queue.current.then(run);
      queue.current = result.catch(() => {});
      result.then(
        () => {
          if (--inFlight.current === 0) setStatus("synced");
        },
        () => {
          inFlight.current--;
          setStatus("error");
        },
      );
      return result;
    },
    [acceptRow],
  );

  const actions = useMemo<GameActions>(
    () => ({
      setStateAt: (path, value) => write({ kind: "set", path, value }),
      mergeStateAt: (path, value) => write({ kind: "merge", path, value }),
      mergePlayer: (playerId, patch) => write({ kind: "player", playerId, patch }),
      update: (patch) => write({ kind: "update", patch }),
    }),
    [write],
  );

  const game = useMemo(
    () => (pending.length ? applyOps(server, pending.map((p) => p.op)) : server),
    [server, pending],
  );

  return { game, actions, status };
}
