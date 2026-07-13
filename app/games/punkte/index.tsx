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

interface PunkteSettings extends LimitSettings {
  presetId?: keyof typeof t.punkte.presets;
  /** Optional sanity check: warn if a round's points don't sum to this. */
  roundTotal?: number | null;
}

/**
 * Presets configure the same limit+mode+roundTotal this board already
 * supports — they don't need their own game modules. "Eigene Regeln"
 * (custom) keeps whatever the host dials in manually. `roundTotal` warns
 * when a round's points don't add up (Hearts 26, zero-sum tallies 0).
 */
const PRESETS: {
  id: keyof typeof t.punkte.presets;
  limit: number | null;
  limitMode: "win" | "lose";
  roundTotal?: number | null;
}[] = [
  { id: "custom", limit: null, limitMode: "win" },
  { id: "romme", limit: null, limitMode: "win" },
  { id: "uno", limit: 500, limitMode: "lose" },
  { id: "maumau", limit: 100, limitMode: "lose" },
  { id: "skyjo", limit: 100, limitMode: "lose" },
  { id: "hearts", limit: 100, limitMode: "lose", roundTotal: 26 },
  { id: "canasta", limit: 5000, limitMode: "win" },
  { id: "sechsnimmt", limit: 66, limitMode: "lose" },
  { id: "flip7", limit: 200, limitMode: "win" },
  { id: "cabo", limit: 100, limitMode: "lose" },
  { id: "yaniv", limit: 100, limitMode: "lose" },
  { id: "zehntausend", limit: 10000, limitMode: "win" },
  // Points-per-deal card games. Skat: game value per deal (loser goes
  // negative), higher wins. Schafkopf/Doppelkopf settle zero-sum each
  // deal, so a round should total 0.
  { id: "skat", limit: null, limitMode: "win" },
  { id: "schafkopf", limit: null, limitMode: "win", roundTotal: 0 },
  { id: "doppelkopf", limit: null, limitMode: "win", roundTotal: 0 },
];

/**
 * The universal score pad: raw points per round, running total, optional
 * limit. Covers Rommé, Uno, Skyjo, Hearts, Canasta, 6 nimmt!, Flip 7 & co.
 * via presets — none of those need a dedicated game module.
 */
export const punkteDefinition = defineRoundsGame<number, PunkteSettings>(
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
    defaultSettings: {
      limit: null,
      limitMode: "win",
      presetId: "custom",
      roundTotal: null,
    },
    SettingsPanel: ({ settings, patchSettings }) => {
      // Manually tweaking any rule after picking a preset means it no
      // longer matches exactly — fall back to "custom".
      const patchCustom = (patch: Partial<PunkteSettings>) =>
        patchSettings({ ...patch, presetId: "custom" });
      return (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm" htmlFor="punkte-preset">
              {t.punkte.presetLabel}
            </label>
            <p className="mb-2 text-xs text-muted">{t.punkte.presetHint}</p>
            <select
              id="punkte-preset"
              value={settings.presetId ?? "custom"}
              onChange={(e) => {
                const preset = PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  patchSettings({
                    presetId: preset.id,
                    limit: preset.limit,
                    limitMode: preset.limitMode,
                    roundTotal: preset.roundTotal ?? null,
                  });
                }
              }}
              className="h-11 w-full rounded-xl border border-transparent bg-field px-4 text-sm focus:border-primary focus:outline-none"
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {t.punkte.presets[preset.id]}
                </option>
              ))}
            </select>
          </div>
          <LimitSettingsPanel
            settings={settings}
            patchSettings={patchCustom}
            modeEditable
          />
          <div>
            <label className="mb-1.5 block text-sm" htmlFor="punkte-roundtotal">
              {t.punkte.roundTotalLabel}{" "}
              <span className="text-xs text-muted">
                {t.punkte.roundTotalOptional}
              </span>
            </label>
            <p className="mb-2 text-xs text-muted">{t.punkte.roundTotalHint}</p>
            <input
              id="punkte-roundtotal"
              type="number"
              inputMode="numeric"
              value={settings.roundTotal ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                patchCustom({
                  roundTotal:
                    e.target.value === "" || Number.isNaN(n) ? null : n,
                });
              }}
              className="h-11 w-32 rounded-xl border border-transparent bg-field px-4 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      );
    },
  },
  {
    emptyEntry: 0,
    isEntryComplete: () => true,
    roundScore: (entry) => entry,
    turnChip: "starter",
    leaderDirection: (s) => (s.limitMode === "lose" ? "low" : "high"),
    roundWarning: ({ entries, players, settings }) => {
      const expected = settings.roundTotal;
      if (expected === null || expected === undefined) return null;
      // Only once everyone's entered — otherwise it warns mid-input.
      if (!players.every((p) => entries[p.id] !== undefined)) return null;
      const sum = players.reduce((acc, p) => acc + (entries[p.id] ?? 0), 0);
      return sum === expected
        ? null
        : t.punkte.roundTotalMismatch(sum, expected);
    },
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
