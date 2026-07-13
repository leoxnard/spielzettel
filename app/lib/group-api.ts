import { supabase } from "./supabase";
import type { GameRow, GroupRow } from "./types";

export async function fetchGroupByCode(code: string): Promise<GroupRow | null> {
  const { data, error } = await supabase
    .from("groups")
    .select()
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as GroupRow | null;
}

/**
 * The whole join flow in one round-trip: find-or-create the group by name and
 * add the caller as a member (idempotent, deduped on lowercased name). Returns
 * the full group row. Replaces the fetch → insert → add-member waterfall.
 */
export async function joinGroup(
  name: string,
  memberName: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_join", {
    p_name: name.trim(),
    p_member_name: memberName.trim(),
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
