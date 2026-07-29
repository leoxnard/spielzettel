import type { ComponentType, ReactNode } from "react";

import type { GameRow, Json, Player } from "~/lib/types";

export interface GameBoardProps<TState> {
  game: GameRow;
  state: TState;
  players: Player[];
  /**
   * Injected writers for score data — boards never talk to Supabase
   * directly. `setStateAt(path, null)` clears the path; `mergeStateAt`
   * shallow-merges an object at the path (safe for concurrent writers).
   */
  setStateAt: (path: string[], value: Json | null) => Promise<void>;
  mergeStateAt: (
    path: string[],
    value: Record<string, Json | null>,
  ) => Promise<void>;
  /** Start a new game with the same players and settings. */
  onNewGame?: () => void;
  /** Called once when the game ends (verdict.over). */
  onGameOver?: () => void;
}

export interface GameSettingsPanelProps<TSettings> {
  settings: TSettings;
  players: Player[];
  /** Persists a partial settings patch (merged server-side). */
  patchSettings: (patch: Partial<TSettings>) => void;
}

/** Settings every game shares; games extend this with their own fields. */
export interface BaseSettings {
  /** Chosen in the lobby (list order, manual pick, or lucky wheel). */
  startPlayerId?: string;
  /** Off by default — shows a "wer beginnt/gibt" chip during play. */
  showTurnOrder?: boolean;
}

/**
 * The contract every game implements. Adding a game to the app means:
 * one folder under app/games/<slug>/ with this definition, then one entry
 * in registry.ts — nothing else. See ARCHITECTURE.md.
 */
export interface GameDefinition<
  TState = Record<string, Json>,
  TSettings extends BaseSettings = BaseSettings,
> {
  slug: string;
  name: string;
  description: string;
  icon: ReactNode;
  /** Tailwind classes for the icon tile, e.g. "bg-accent text-accent-ink". */
  iconClass: string;
  minPlayers: number;
  maxPlayers: number;
  /** Lobby subtitle, e.g. "Lobby · Wer würfelt mit?" */
  lobbySubtitle: string;
  /** Heading on the playing board when no custom title is set, e.g. "Kniffelblock". */
  boardTitle: string;
  /** Bullet points for the "So funktioniert der Block" explainer. */
  howItWorks: readonly string[];
  /** Defaults merged under lobby-edited settings before the game starts. */
  defaultSettings: TSettings;
  /** Optional lobby section for game-specific settings (limit, categories, …). */
  SettingsPanel?: ComponentType<GameSettingsPanelProps<TSettings>>;
  /** True if the board can show a "wer beginnt/gibt" chip (rounds games with a turnChip). */
  supportsTurnOrder?: boolean;
  /** True once the state contains real game data (not just settings). */
  hasStarted: (state: Record<string, Json>) => boolean;
  createInitialState: (players: Player[], settings: TSettings) => TState;
  /**
   * Called when the game is (re-)started with existing state — e.g. after
   * going back to the lobby to add a player. Must keep existing scores and
   * settings and add entries for new players.
   */
  mergeStateForPlayers: (state: TState, players: Player[]) => TState;
  /** One line under the board title, e.g. "5/26 Felder ausgefüllt" or "Runde 3 von 20". */
  getStatusLine: (state: TState, players: Player[]) => string;
  /**
   * Winning player id(s) given the current state — the final winner once
   * decided, otherwise the current leader. Empty when there's no data yet
   * (nothing played). Powers group stats/rankings. Ties return everyone
   * tied for the lead.
   */
  getWinnerIds?: (state: TState, players: Player[]) => string[];
  /**
   * Label for group stats (leaderboard filter + games-by-type). Lets a game
   * report a more specific bucket than its generic name — e.g. Punkteblock
   * reports the chosen preset ("Uno", "Hearts") or "Andere". Defaults to `name`.
   */
  groupLabel?: (state: TState) => string;
  Board: ComponentType<GameBoardProps<TState>>;
}
