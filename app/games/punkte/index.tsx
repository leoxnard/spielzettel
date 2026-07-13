import { t } from "~/i18n/de";
import { limitVerdict } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import {
  LimitSettingsPanel,
  type LimitSettings,
} from "../rounds/LimitSettingsPanel";
import { MiniStepper } from "../rounds/MiniStepper";

function PunkteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 6h9M4 12h9M4 18h5" />
      <path d="M17 14v6M14 17h6" />
    </svg>
  );
}

/**
 * The universal score pad: raw points per round, running total, optional
 * limit. Covers Rommé, Uno, Skyjo, Hearts, Canasta & Co.
 */
export const punkteDefinition = defineRoundsGame<number, LimitSettings>(
  {
    slug: "punkte",
    name: t.punkte.name,
    description: t.punkte.description,
    icon: <PunkteIcon />,
    iconClass: "bg-primary text-primary-ink",
    minPlayers: 1,
    maxPlayers: 6,
    lobbySubtitle: t.punkte.subtitle,
    boardTitle: t.punkte.boardTitle,
    howItWorks: t.punkte.howItWorks,
    defaultSettings: { limit: null, limitMode: "win" },
    SettingsPanel: ({ settings, patchSettings }) => (
      <LimitSettingsPanel
        settings={settings}
        patchSettings={patchSettings}
        modeEditable
      />
    ),
  },
  {
    emptyEntry: 0,
    isEntryComplete: () => true,
    roundScore: (entry) => entry,
    turnChip: "starter",
    verdict: ({ totals, state }) =>
      limitVerdict(
        totals,
        state.settings.limit,
        state.settings.limitMode ?? "win",
        t.rounds.limitReached,
      ),
    EntryEditor: ({ player, value, onChange }) => (
      <MiniStepper
        value={value ?? null}
        onChange={onChange}
        min={-999}
        max={999}
        label={`${t.rounds.points} ${player.name}`}
      />
    ),
  },
);
