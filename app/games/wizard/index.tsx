import { t } from "~/i18n/de";
import type { BaseSettings } from "../types";
import { lastRoundVerdict } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import { BidTricksEditor, type BidTricksEntry } from "../rounds/BidTricksEditor";
import { wizardCards, wizardMaxRounds, wizardRoundScore } from "./scoring";

function WizardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 19 9.5-9.5M13 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7zM5 5l.7 1.3L7 7l-1.3.7L5 9l-.7-1.3L3 7l1.3-.7z" />
    </svg>
  );
}

export const wizardDefinition = defineRoundsGame<BidTricksEntry, BaseSettings>(
  {
    slug: "wizard",
    name: t.wizard.name,
    description: t.wizard.description,
    icon: <WizardIcon />,
    iconClass: "bg-[#7c5cd6] text-white",
    minPlayers: 3,
    maxPlayers: 6,
    lobbySubtitle: t.wizard.subtitle,
    boardTitle: t.wizard.boardTitle,
    howItWorks: t.wizard.howItWorks,
    defaultSettings: {},
  },
  {
    emptyEntry: { bid: null, tricks: null },
    isEntryComplete: (e) => e.bid !== null && e.tricks !== null,
    roundScore: (e) => wizardRoundScore(e),
    maxRounds: (players) => wizardMaxRounds(players.length),
    roundTitle: (r) =>
      `${t.rounds.round(r + 1)} · ${t.wizard.cards(wizardCards(r))}`,
    turnChip: "dealer",
    verdict: ({ totals, playedRounds, players, state }) =>
      lastRoundVerdict(
        totals,
        playedRounds,
        wizardMaxRounds(players.length) || state.currentRound,
        t.rounds.allRoundsPlayed,
      ),
    EntryEditor: ({ player, value, onChange, roundIndex }) => (
      <BidTricksEditor
        player={player}
        value={value}
        onChange={onChange}
        max={wizardCards(roundIndex)}
        bidLabel={t.wizard.bid}
        tricksLabel={t.wizard.tricks}
      />
    ),
  },
);
