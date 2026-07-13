import { useRef, useState } from "react";

import { Button } from "~/components/ui/Button";
import { Modal } from "~/components/ui/Modal";
import { t } from "~/i18n/de";
import type { Player } from "~/lib/types";

interface StartPlayerPickerProps {
  players: Player[];
  startPlayerId?: string;
  onPick: (playerId: string) => void;
}

export function resolveStarter(
  players: Player[],
  startPlayerId?: string,
): Player {
  return players.find((p) => p.id === startPlayerId) ?? players[0];
}

export function StartPlayerPicker({
  players,
  startPlayerId,
  onPick,
}: StartPlayerPickerProps) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const starter = resolveStarter(players, startPlayerId);
  if (!starter) return null;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{t.lobby.whoStarts}</span>
      </div>
      <p className="mb-3 text-xs text-muted">{t.lobby.whoStartsHint}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-field px-3.5 py-2 text-sm font-medium">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: starter.color }}
          />
          {t.lobby.startsChip(displayName(starter, players))}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setWheelOpen(true)}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v9l6.4 6.4M12 12 5.6 18.4M12 12l9-2.4M12 12 3 9.6" />
          </svg>
          {t.lobby.spinWheel}
        </Button>
      </div>
      <LuckyWheel
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        players={players}
        onPick={onPick}
      />
    </div>
  );
}

export function displayName(player: Player, players: Player[]): string {
  if (player.name.trim()) return player.name;
  const index = players.findIndex((p) => p.id === player.id);
  return t.lobby.defaultPlayerName((index === -1 ? 0 : index) + 1);
}

const SPIN_TURNS = 5;
const SPIN_MS = 3200;

function LuckyWheel({
  open,
  onClose,
  players,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  players: Player[];
  onPick: (playerId: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Player | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const slice = 360 / players.length;

  const spin = () => {
    const winnerIndex = Math.floor(Math.random() * players.length);
    const winner = players[winnerIndex];
    // Rotate so the winner's slice center lands under the top pointer,
    // always adding full turns relative to the current rotation.
    const center = winnerIndex * slice + slice / 2;
    const current = ((rotation % 360) + 360) % 360;
    const delta = SPIN_TURNS * 360 + ((360 - center - current) % 360);
    setResult(null);
    setSpinning(true);
    setRotation(rotation + delta);
    clearTimeout(doneTimer.current);
    // Fallback for prefers-reduced-motion (transition ends immediately).
    doneTimer.current = setTimeout(() => finish(winner), SPIN_MS + 400);
  };

  const finish = (winner: Player) => {
    clearTimeout(doneTimer.current);
    setSpinning(false);
    setResult(winner);
    onPick(winner.id);
  };

  const close = () => {
    clearTimeout(doneTimer.current);
    setSpinning(false);
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={t.lobby.whoStarts}>
      <div className="flex flex-col items-center">
        <div className="relative mb-5">
          {/* pointer */}
          <svg
            width="22"
            height="18"
            viewBox="0 0 22 18"
            className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 text-ink drop-shadow"
            aria-hidden
          >
            <path d="M11 18 1 0h20Z" fill="currentColor" />
          </svg>
          <svg
            width="240"
            height="240"
            viewBox="-100 -100 200 200"
            role="img"
            aria-label={t.lobby.spinWheel}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.9, 0.25, 1)`,
            }}
          >
            {players.map((p, i) => {
              const start = ((i * slice - 90) * Math.PI) / 180;
              const end = (((i + 1) * slice - 90) * Math.PI) / 180;
              const mid = (i * slice + slice / 2 - 90) * (Math.PI / 180);
              const large = slice > 180 ? 1 : 0;
              const path =
                players.length === 1
                  ? undefined
                  : `M0 0 L${95 * Math.cos(start)} ${95 * Math.sin(start)} A95 95 0 ${large} 1 ${95 * Math.cos(end)} ${95 * Math.sin(end)} Z`;
              return (
                <g key={p.id}>
                  {path ? (
                    <path d={path} fill={p.color} stroke="var(--surface)" strokeWidth="2" />
                  ) : (
                    <circle r="95" fill={p.color} />
                  )}
                  <text
                    x={60 * Math.cos(mid)}
                    y={60 * Math.sin(mid)}
                    transform={`rotate(${i * slice + slice / 2}, ${60 * Math.cos(mid)}, ${60 * Math.sin(mid)})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {displayName(p, players).slice(0, 10)}
                  </text>
                </g>
              );
            })}
            <circle r="14" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          </svg>
        </div>
        <p
          className="mb-4 h-6 font-display text-lg font-semibold"
          aria-live="polite"
        >
          {spinning
            ? t.lobby.spinning
            : result
              ? t.lobby.wheelResult(displayName(result, players))
              : " "}
        </p>
        <div className="grid w-full grid-cols-2 gap-3">
          <Button variant="secondary" onClick={close} disabled={spinning}>
            {t.modal.close}
          </Button>
          <Button onClick={spin} disabled={spinning}>
            {result ? t.lobby.spinAgain : t.lobby.spinWheel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
