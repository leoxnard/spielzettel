import type { ComponentType, ReactNode } from "react";

import type { Json, Player } from "~/lib/types";
import type { BaseSettings, GameSettingsPanelProps } from "../types";

/**
 * Shared state shape for round-based games: entries live under
 * rounds[roundIndex][playerId] and are written via merge_state_at, so
 * players entering the same round concurrently never clobber each other.
 */
export interface RoundsState<
  E extends Json = number,
  S extends BaseSettings = BaseSettings,
> {
  settings: S;
  rounds: Record<string, Record<string, E>>;
  /** Index of the round currently being played. */
  currentRound: number;
}

export interface Verdict {
  over: boolean;
  winnerIds: string[];
  /** Short explanation, e.g. "66 Punkte erreicht." */
  reason?: string;
}

export interface EntryEditorProps<E extends Json> {
  player: Player;
  value: E | undefined;
  onChange: (value: E) => void;
  roundIndex: number;
}

export interface RoundsConfig<
  E extends Json = number,
  S extends BaseSettings = BaseSettings,
> {
  emptyEntry: E;
  isEntryComplete: (entry: E) => boolean;
  /** Score an entry contributes in its round. */
  roundScore: (entry: E, roundIndex: number) => number;
  /**
   * Optional override for a player's total across their round entries
   * (e.g. Spades bag penalties). Defaults to the sum of roundScore.
   */
  totalScore?: (entries: (E | undefined)[], settings: S) => number;
  /** Fixed number of rounds (e.g. Wizard) — null/absent = open-ended. */
  maxRounds?: (players: Player[], settings: S) => number | null;
  /** Heading of the current round, defaults to "Runde N". */
  roundTitle?: (roundIndex: number, players: Player[], settings: S) => string;
  /** Show whose turn it is: rotates from settings.startPlayerId. */
  turnChip?: "starter" | "dealer";
  verdict: (ctx: {
    totals: Record<string, number>;
    state: RoundsState<E, S>;
    players: Player[];
    playedRounds: number;
  }) => Verdict;
  EntryEditor: ComponentType<EntryEditorProps<E>>;
  /** Extra per-player line in the totals header (e.g. "Phase 4"). */
  playerMeta?: (playerId: string, state: RoundsState<E, S>) => string | null;
}

/** Everything needed to register a rounds-based game. */
export interface RoundsGameMeta<S extends BaseSettings> {
  slug: string;
  name: string;
  description: string;
  icon: ReactNode;
  iconClass: string;
  minPlayers: number;
  maxPlayers: number;
  lobbySubtitle: string;
  boardTitle: string;
  howItWorks: readonly string[];
  defaultSettings: S;
  SettingsPanel?: ComponentType<GameSettingsPanelProps<S>>;
}
