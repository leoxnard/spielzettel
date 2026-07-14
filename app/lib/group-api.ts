import { updateGame } from "./game-api";
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

export async function fetchGroupById(id: string): Promise<GroupRow | null> {
  const { data, error } = await supabase
    .from("groups")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as GroupRow | null;
}

/** Thrown by loginGroup: no group with that name exists. */
export const GROUP_NOT_FOUND = "P0002";
/** Thrown by loginGroup: the group has a secret and the wrong one was given. */
export const GROUP_WRONG_SECRET = "P0003";
/** Thrown by createGroup: a group with that name already exists. */
export const GROUP_NAME_TAKEN = "23505";

/**
 * Log into an existing group by name (+ password if it has one). Throws with
 * code GROUP_NOT_FOUND if no such group exists, or GROUP_WRONG_SECRET if the
 * password is wrong. A group without a secret accepts any/empty password.
 */
export async function loginGroup(
  name: string,
  secret?: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_login", {
    p_name: name.trim(),
    p_secret: secret?.trim() || null,
  });
  if (error) throw error;
  return data as GroupRow;
}

/**
 * Create a brand-new group by name (+ optional password). Throws with code
 * GROUP_NAME_TAKEN if the name is already in use.
 */
export async function createGroup(
  name: string,
  secret?: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_create", {
    p_name: name.trim(),
    p_secret: secret?.trim() || null,
  });
  if (error) throw error;
  return data as GroupRow;
}

/**
 * Set, change, or clear the group's login password. `null`/empty clears it
 * (open group). Returns the group.
 */
export async function setGroupSecret(
  groupId: string,
  secret: string | null,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_set_secret", {
    p_group_id: groupId,
    p_secret: secret?.trim() || null,
  });
  if (error) throw error;
  return data as GroupRow;
}

/** Permanently delete a group and every game played under it. */
export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc("group_delete", { p_group_id: groupId });
  if (error) throw error;
}

/** Add a person to an existing group by id (idempotent). Returns the group. */
export async function addGroupMember(
  groupId: string,
  name: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_member_add", {
    p_group_id: groupId,
    p_name: name.trim(),
  });
  if (error) throw error;
  return data as GroupRow;
}

/** Remove a member. Returns the group. */
export async function removeGroupMember(
  groupId: string,
  memberId: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_member_remove", {
    p_group_id: groupId,
    p_member_id: memberId,
  });
  if (error) throw error;
  return data as GroupRow;
}

/** Rename a member (id follows the new name). Returns the group. */
export async function renameGroupMember(
  groupId: string,
  oldId: string,
  newName: string,
): Promise<GroupRow> {
  const { data, error } = await supabase.rpc("group_member_rename", {
    p_group_id: groupId,
    p_old_id: oldId,
    p_new_name: newName.trim(),
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

/**
 * Merge one player's stats into another by rewriting their name in every game
 * where they appear. Stats are keyed by (case-insensitive) name, so this is
 * what actually combines the two players' history. Only valid when the two
 * never shared a game — otherwise that game would count twice; the caller
 * enforces that guard.
 */
export async function mergeGroupPlayers(
  games: GameRow[],
  fromName: string,
  toName: string,
): Promise<void> {
  const fromId = fromName.trim().toLowerCase();
  const to = toName.trim();
  for (const game of games) {
    if (!game.players.some((p) => p.name.trim().toLowerCase() === fromId)) {
      continue;
    }
    const players = game.players.map((p) =>
      p.name.trim().toLowerCase() === fromId ? { ...p, name: to } : p,
    );
    await updateGame(game.id, { players });
  }
}

/** "Reset stats": permanently deletes all of the group's games. */
export async function resetGroupGames(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("group_id", groupId);
  if (error) throw error;
}
