import { t } from "~/i18n/de";
import type { GameDefinition } from "../types";
import { DartsBoard } from "./DartsBoard";
import { DartsSettingsPanel } from "./DartsSettingsPanel";
import {
  DEFAULT_SETTINGS,
  evaluate,
  resolveSettings,
  roundNumber,
  winnerIds,
} from "./logic";
import type { DartsSettings, DartsState } from "./types";

function DartsIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" strokeLinecap="round" />
    </svg>
  );
}

export const dartsDefinition: GameDefinition<DartsState, DartsSettings> = {
  slug: "darts",
  name: t.darts.name,
  description: t.darts.description,
  icon: <DartsIcon />,
  iconClass: "bg-ink text-background",
  minPlayers: 1,
  maxPlayers: 8,
  lobbySubtitle: t.darts.subtitle,
  boardTitle: t.darts.boardTitle,
  howItWorks: t.darts.howItWorks,
  defaultSettings: {
    mode: DEFAULT_SETTINGS.mode,
    start: DEFAULT_SETTINGS.start,
    doubleOut: DEFAULT_SETTINGS.doubleOut,
    doubleIn: DEFAULT_SETTINGS.doubleIn,
  },
  SettingsPanel: DartsSettingsPanel,
  hasStarted: (state) => "turns" in state,
  createInitialState: (_players, settings) => ({ settings, turns: {} }),
  mergeStateForPlayers: (state) => ({ ...state, turns: state.turns ?? {} }),
  getStatusLine: (state, players) => {
    const ev = evaluate(state, players);
    const winner = players.find((p) => p.id === ev.winnerId);
    if (winner) return t.darts.statusWon(winner.name);
    const round = roundNumber(ev.turns, players);
    return ev.settings.mode === "cricket"
      ? t.darts.statusCricket(round)
      : t.darts.statusX01(ev.settings.start, round);
  },
  getWinnerIds: (state, players) => winnerIds(state, players),
  groupLabel: (state) => {
    const s = resolveSettings(state.settings);
    return t.darts.groupLabel(s.mode === "cricket" ? t.darts.modeCricket : String(s.start));
  },
  Board: DartsBoard,
};
