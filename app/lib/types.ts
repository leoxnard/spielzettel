export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type GameStatus = "lobby" | "playing" | "finished";

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface GameRow {
  id: string;
  code: string;
  game_type: string;
  title: string | null;
  status: GameStatus;
  players: Player[];
  state: Record<string, Json>;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

/** A named person in a group; `id` is the lowercased name (dedupe key). */
export interface GroupMember {
  id: string;
  name: string;
}

/**
 * A group is identified by its name — enter a name and you're in that group.
 * People join by entering their own name, which is appended to `members`;
 * games are tagged with the group's id and stats are derived from the games'
 * own player names.
 */
export interface GroupRow {
  id: string;
  code: string;
  name: string;
  members: GroupMember[];
  created_at: string;
}

/** Assigned round-robin as players are added; tap the number chip to cycle. */
export const PLAYER_COLORS = [
  "#177e63", // teal
  "#d9a036", // amber
  "#7c5cd6", // violet
  "#d6567a", // rose
  "#3f7bd9", // blue
  "#d96e30", // orange
] as const;
