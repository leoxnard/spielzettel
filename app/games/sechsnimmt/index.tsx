import { t } from "~/i18n/de";
import { limitVerdict } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import {
  LimitSettingsPanel,
  type LimitSettings,
} from "../rounds/LimitSettingsPanel";
import { MiniStepper } from "../rounds/MiniStepper";

function SechsNimmtIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4c0 3 2 5 4 5M20 4c0 3-2 5-4 5" />
      <circle cx="12" cy="14" r="6" />
      <circle cx="9.8" cy="13" r="0.5" fill="currentColor" />
      <circle cx="14.2" cy="13" r="0.5" fill="currentColor" />
      <path d="M10.5 16.5c.9.7 2.1.7 3 0" />
    </svg>
  );
}

export const sechsNimmtDefinition = defineRoundsGame<number, LimitSettings>(
  {
    slug: "sechsnimmt",
    name: t.sechsnimmt.name,
    description: t.sechsnimmt.description,
    icon: <SechsNimmtIcon />,
    iconClass: "bg-[#d95a30] text-white",
    minPlayers: 2,
    maxPlayers: 6,
    lobbySubtitle: t.sechsnimmt.subtitle,
    boardTitle: t.sechsnimmt.boardTitle,
    howItWorks: t.sechsnimmt.howItWorks,
    defaultSettings: { limit: 66, limitMode: "lose" },
    SettingsPanel: ({ settings, patchSettings }) => (
      <LimitSettingsPanel
        settings={settings}
        patchSettings={patchSettings}
        limitOptional={false}
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
        state.settings.limit ?? 66,
        "lose",
        t.rounds.limitReached,
      ),
    EntryEditor: ({ player, value, onChange }) => (
      <MiniStepper
        value={value ?? null}
        onChange={onChange}
        min={0}
        max={99}
        label={`${t.rounds.points} ${player.name}`}
      />
    ),
  },
);
