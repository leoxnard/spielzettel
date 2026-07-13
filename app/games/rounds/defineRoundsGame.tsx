import { t } from "~/i18n/de";
import type { Json, Player } from "~/lib/types";
import type { BaseSettings, GameBoardProps, GameDefinition } from "../types";
import { verdictOf } from "./engine";
import { RoundsBoard } from "./RoundsBoard";
import type { RoundsConfig, RoundsGameMeta, RoundsState } from "./types";

/**
 * Builds a complete GameDefinition from round meta + config. All
 * rounds-based games (Punkteblock, Wizard, Spades, …) go through here —
 * they only supply scoring rules, an entry editor and optional settings.
 */
export function defineRoundsGame<E extends Json, S extends BaseSettings>(
  meta: RoundsGameMeta<S>,
  config: RoundsConfig<E, S>,
): GameDefinition<RoundsState<E, S>, S> {
  function Board(props: GameBoardProps<RoundsState<E, S>>) {
    return <RoundsBoard {...props} config={config} />;
  }

  return {
    ...meta,
    supportsTurnOrder: !!config.turnChip,
    hasStarted: (state) => "rounds" in state,
    createInitialState: (_players: Player[], settings: S) => ({
      settings,
      rounds: {},
      currentRound: 0,
    }),
    // Entries are keyed by playerId inside each round — new players simply
    // have no past entries (scored as 0), so the state carries over as-is.
    mergeStateForPlayers: (state) => state,
    getStatusLine: (state, players) => {
      const verdict = verdictOf(state, config, players);
      if (verdict.over) return t.rounds.gameOver;
      const max = config.maxRounds?.(players, state.settings) ?? null;
      const current = Math.min(state.currentRound + 1, max ?? Infinity);
      return max ? t.rounds.roundOf(current, max) : t.rounds.round(current);
    },
    Board,
  };
}
