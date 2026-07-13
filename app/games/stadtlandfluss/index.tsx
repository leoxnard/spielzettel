import { t } from "~/i18n/de";
import type { GameDefinition } from "../types";
import { newRound, type SlfSettings, type SlfState } from "./logic";
import { SlfBoard } from "./SlfBoard";

function SlfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export const slfDefinition: GameDefinition<SlfState, SlfSettings> = {
  slug: "stadtlandfluss",
  name: t.slf.name,
  description: t.slf.description,
  icon: <SlfIcon />,
  iconClass: "bg-[#3f7bd9] text-white",
  minPlayers: 2,
  maxPlayers: 6,
  lobbySubtitle: t.slf.subtitle,
  boardTitle: t.slf.boardTitle,
  howItWorks: [
    "Jede Runde bekommt einen zufälligen Buchstaben – alle tippen ihre Antworten auf dem eigenen Gerät.",
    "Wer fertig ist, drückt Stopp. Dann werden alle Antworten aufgedeckt.",
    "Punkte pro Antwort antippen: 0 → 5 → 10 → 20 (Vorschlag: 10 für jede gültige Antwort).",
    "„Runde werten“ schließt die Runde ab, danach geht’s mit neuem Buchstaben weiter.",
  ],
  defaultSettings: { categories: [...t.slf.defaultCategories] },
  SettingsPanel: ({ settings, patchSettings }) => (
    <div>
      <label className="mb-1.5 block text-sm" htmlFor="slf-categories">
        {t.slf.categoriesLabel}{" "}
        <span className="text-xs text-muted">{t.slf.categoriesHint}</span>
      </label>
      <textarea
        id="slf-categories"
        rows={6}
        defaultValue={settings.categories.join("\n")}
        onChange={(e) => {
          const categories = e.target.value
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean);
          if (categories.length > 0) patchSettings({ categories });
        }}
        className="w-full rounded-xl border border-transparent bg-field px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  ),
  hasStarted: (state) => "rounds" in state,
  createInitialState: (_players, settings) => ({
    settings,
    rounds: { "0": newRound([]) },
    currentRound: 0,
  }),
  mergeStateForPlayers: (state) => state,
  getStatusLine: (state) => {
    const round = state.rounds?.[String(state.currentRound)];
    return round
      ? `${t.rounds.round(state.currentRound + 1)} · ${t.slf.letter} ${round.letter}`
      : t.rounds.round(state.currentRound + 1);
  },
  Board: SlfBoard,
};
