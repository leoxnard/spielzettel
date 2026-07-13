import { t } from "~/i18n/de";
import { limitVerdict } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import {
  LimitSettingsPanel,
  type LimitSettings,
} from "../rounds/LimitSettingsPanel";
import { MiniStepper } from "../rounds/MiniStepper";

function Flip7Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9.5 8h5l-3 8" />
    </svg>
  );
}

export const flip7Definition = defineRoundsGame<number, LimitSettings>(
  {
    slug: "flip7",
    name: t.flip7.name,
    description: t.flip7.description,
    icon: <Flip7Icon />,
    iconClass: "bg-[#d6567a] text-white",
    minPlayers: 2,
    maxPlayers: 6,
    lobbySubtitle: t.flip7.subtitle,
    boardTitle: t.flip7.boardTitle,
    howItWorks: t.flip7.howItWorks,
    defaultSettings: { limit: 200, limitMode: "win" },
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
    turnChip: "dealer",
    verdict: ({ totals, state }) =>
      limitVerdict(
        totals,
        state.settings.limit ?? 200,
        "win",
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
