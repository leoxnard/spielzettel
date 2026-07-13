import { t } from "~/i18n/de";
import type { Player } from "~/lib/types";
import type { GameDefinition } from "../types";
import { KniffelBoard } from "./KniffelBoard";
import { filledCount, grandTotal, playerScores } from "./scoring";
import { ALL_CATEGORIES, type KniffelState } from "./types";

function KniffelIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <circle cx="8.2" cy="8.2" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="8.2" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="15.8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="15.8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const kniffelDefinition: GameDefinition<KniffelState> = {
  slug: "kniffel",
  name: t.kniffel.name,
  description: t.kniffel.description,
  icon: <KniffelIcon />,
  iconClass: "bg-accent text-accent-ink",
  minPlayers: 1,
  maxPlayers: 6,
  lobbySubtitle: t.kniffel.subtitle,
  boardTitle: t.kniffel.boardTitle,
  howItWorks: t.kniffel.howItWorks,
  defaultSettings: {},
  hasStarted: (state) => "scores" in state,
  createInitialState: (players: Player[], settings) => ({
    settings,
    scores: Object.fromEntries(players.map((p) => [p.id, {}])),
  }),
  mergeStateForPlayers: (state, players) => ({
    ...state,
    scores: {
      ...Object.fromEntries(players.map((p) => [p.id, {}])),
      ...state.scores,
    },
  }),
  getStatusLine: (state, players) => {
    const filled = players.reduce(
      (sum, p) => sum + filledCount(playerScores(state, p.id)),
      0,
    );
    return t.game.progress(filled, players.length * ALL_CATEGORIES.length);
  },
  getWinnerIds: (state, players) => {
    const scored = players.filter(
      (p) => filledCount(playerScores(state, p.id)) > 0,
    );
    if (scored.length === 0) return [];
    const totalOf = (p: Player) => grandTotal(playerScores(state, p.id));
    const best = Math.max(...scored.map(totalOf));
    return scored.filter((p) => totalOf(p) === best).map((p) => p.id);
  },
  Board: KniffelBoard,
};
