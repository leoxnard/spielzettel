import { generateCode } from "./game-code";
import { supabase } from "./supabase";
import type { GameRow, GroupRow } from "./types";

const norm = (name: string) => name.trim().toLowerCase();

const UNIQUE_VIOLATION = "23505";

export async function fetchGroupByCode(code: string): Promise<GroupRow | null> {
  const { data, error } = await supabase
    .from("groups")
    .select()
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as GroupRow | null;
}

export async function fetchGroupByName(name: string): Promise<GroupRow | null> {
  const { data, error } = await supabase
    .from("groups")
    .select()
    .ilike("name", name.trim())
    .maybeSingle();
  if (error) throw error;
  return data as GroupRow | null;
}

/**
 * The whole "join" flow: a group name maps to exactly one group. Enter a
 * name → get the existing group with that name, or create it. Handles the
 * race where two people create the same name at once via the unique index.
 */
export async function findOrCreateGroup(name: string): Promise<GroupRow> {
  const trimmed = name.trim();
  const existing = await fetchGroupByName(trimmed);
  if (existing) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("groups")
      .insert({ code: generateCode(), name: trimmed })
      .select()
      .single();
    if (!error) return data as GroupRow;
    if (error.code === UNIQUE_VIOLATION) {
      // Either the code collided (retry) or the name was just taken by
      // someone else (use theirs).
      const raced = await fetchGroupByName(trimmed);
      if (raced) return raced;
      continue;
    }
    throw error;
  }
  throw new Error("could not create group");
}

/**
 * Adds a person to the group by name (idempotent — the RPC dedupes on the
 * lowercased name). Returns the updated group.
 */
export async function addGroupMember(
  code: string,
  name: string,
): Promise<GroupRow> {
  const trimmed = name.trim();
  const { data, error } = await supabase.rpc("group_add_member", {
    p_code: code,
    p_member: { id: norm(trimmed), name: trimmed },
  });
  if (error) throw error;
  return data as GroupRow;
}

/** Every game this group has played, newest first. */
export async function fetchGroupGames(groupId: string): Promise<GameRow[]> {
  const { data, error } = await supabase
    .from("games")
    .select()
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

/** "Reset stats": permanently deletes all of the group's games. */
export async function resetGroupGames(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("group_id", groupId);
  if (error) throw error;
}
