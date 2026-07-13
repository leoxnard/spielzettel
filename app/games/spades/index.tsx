import { t } from "~/i18n/de";
import { limitVerdict } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import { BidTricksEditor, type BidTricksEntry } from "../rounds/BidTricksEditor";
import {
  LimitSettingsPanel,
  type LimitSettings,
} from "../rounds/LimitSettingsPanel";
import { spadesRoundScore, spadesTotal } from "./scoring";

function SpadesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C9.5 6 4.5 9 4.5 13a4.3 4.3 0 0 0 4.3 4.3c.9 0 1.7-.3 2.4-.8-.3 1.6-1 2.9-2.2 3.9V21h6v-.6c-1.2-1-1.9-2.3-2.2-3.9.7.5 1.5.8 2.4.8a4.3 4.3 0 0 0 4.3-4.3c0-4-5-7-7.5-11Z" />
    </svg>
  );
}

export const spadesDefinition = defineRoundsGame<BidTricksEntry, LimitSettings>(
  {
    slug: "spades",
    name: t.spades.name,
    description: t.spades.description,
    icon: <SpadesIcon />,
    iconClass: "bg-[#4a5899] text-white",
    minPlayers: 2,
    maxPlayers: 6,
    lobbySubtitle: t.spades.subtitle,
    boardTitle: t.spades.boardTitle,
    howItWorks: t.spades.howItWorks,
    defaultSettings: { limit: 500, limitMode: "win" },
    SettingsPanel: ({ settings, patchSettings }) => (
      <LimitSettingsPanel settings={settings} patchSettings={patchSettings} />
    ),
  },
  {
    emptyEntry: { bid: null, tricks: null },
    isEntryComplete: (e) => e.bid !== null && e.tricks !== null,
    roundScore: (e) => spadesRoundScore(e),
    totalScore: (entries) => spadesTotal(entries),
    turnChip: "dealer",
    verdict: ({ totals, state }) =>
      limitVerdict(totals, state.settings.limit, "win", t.rounds.limitReached),
    EntryEditor: ({ player, value, onChange }) => (
      <BidTricksEditor
        player={player}
        value={value}
        onChange={onChange}
        max={13}
        bidLabel={t.spades.bid}
        tricksLabel={t.spades.tricks}
      />
    ),
  },
);
