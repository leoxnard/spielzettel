import type { Player } from "~/lib/types";
import { MiniStepper } from "./MiniStepper";

export interface BidTricksEntry {
  bid: number | null;
  tricks: number | null;
  [key: string]: number | null;
}

interface BidTricksEditorProps {
  player: Player;
  value: BidTricksEntry | undefined;
  onChange: (value: BidTricksEntry) => void;
  max: number;
  bidLabel: string;
  tricksLabel: string;
}

/** Two-step entry for trick-taking games: bid first, tricks after the round. */
export function BidTricksEditor({
  player,
  value,
  onChange,
  max,
  bidLabel,
  tricksLabel,
}: BidTricksEditorProps) {
  const entry: BidTricksEntry = value ?? { bid: null, tricks: null };

  const field = (
    key: "bid" | "tricks",
    label: string,
  ) => (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <MiniStepper
        value={entry[key]}
        onChange={(n) => onChange({ ...entry, [key]: n })}
        min={0}
        max={max}
        label={`${label} ${player.name}`}
      />
    </label>
  );

  return (
    <div className="flex gap-4">
      {field("bid", bidLabel)}
      {field("tricks", tricksLabel)}
    </div>
  );
}
