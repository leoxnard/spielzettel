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
  created_at: string;
  updated_at: string;
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
