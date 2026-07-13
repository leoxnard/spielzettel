import { generateCode } from "./game-code";
import { supabase } from "./supabase";
import type { GameRow, GameStatus, Json, Player } from "./types";

const UNIQUE_VIOLATION = "23505";

export async function createGame(gameType: string): Promise<GameRow> {
  let lastError: unknown;
  // Collisions are ~1 in 28M — retry a couple of times just in case.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("games")
      .insert({ code: generateCode(), game_type: gameType })
      .select()
      .single();
    if (!error) return data as GameRow;
    if (error.code !== UNIQUE_VIOLATION) throw error;
    lastError = error;
  }
  throw lastError;
}

export async function fetchGameByCode(code: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select()
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as GameRow | null;
}

export async function fetchGameById(id: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as GameRow | null;
}

/** Lobby-phase fields: low contention, plain last-write-wins updates. */
export async function updateGame(
  id: string,
  patch: Partial<{
    title: string | null;
    players: Player[];
    status: GameStatus;
    state: Record<string, Json>;
  }>,
): Promise<void> {
  const { error } = await supabase.from("games").update(patch).eq("id", id);
  if (error) throw error;
}

/**
 * Score-cell writes go through the `set_state_at` RPC: an atomic
 * `jsonb_set` per row, so concurrent writes to different cells never
 * clobber each other. `value: null` clears the path.
 */
export async function setStateAt(
  gameId: string,
  path: string[],
  value: Json | null,
): Promise<void> {
  const { error } = await supabase.rpc("set_state_at", {
    p_game_id: gameId,
    p_path: path,
    p_value: value,
  });
  if (error) throw error;
}

/**
 * Patches one player (name/color) atomically inside the players array —
 * several people renaming themselves at once never clobber each other.
 */
export async function mergePlayer(
  gameId: string,
  playerId: string,
  patch: Partial<Pick<Player, "name" | "color">>,
): Promise<void> {
  const { error } = await supabase.rpc("merge_player", {
    p_game_id: gameId,
    p_player_id: playerId,
    p_patch: patch,
  });
  if (error) throw error;
}

/**
 * Shallow-merges an object into `state` at `path` (atomic, creates the
 * leaf if missing). Round-based games use this so two players writing
 * into the same round object never clobber each other.
 */
export async function mergeStateAt(
  gameId: string,
  path: string[],
  value: Record<string, Json | null>,
): Promise<void> {
  const { error } = await supabase.rpc("merge_state_at", {
    p_game_id: gameId,
    p_path: path,
    p_value: value,
  });
  if (error) throw error;
}
