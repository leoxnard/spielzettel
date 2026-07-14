import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import { Card } from "~/components/ui/Card";
import { Modal } from "~/components/ui/Modal";
import { GAMES } from "~/games/registry";
import type { GameDefinition } from "~/games/types";
import { t } from "~/i18n/de";
import { useCurrentGroup, type CurrentGroup } from "~/lib/current-group";
import { createGame } from "~/lib/game-api";

export function GameGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {GAMES.map((game, i) => (
        <GameCard key={game.slug} game={game} index={i} />
      ))}
    </section>
  );
}

function GameCard({
  game,
  index,
}: {
  game: GameDefinition;
  index: number;
}) {
  const group = useCurrentGroup();
  const fetcher = useFetcher();
  const [choosing, setChoosing] = useState(false);
  const busy = fetcher.state !== "idle";

  return (
    <Card
      className="flex flex-col p-6 transition-shadow hover:shadow-[0_2px_6px_rgb(0_0_0/0.05),0_16px_32px_-16px_rgb(0_0_0/0.15)] animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className={`mb-5 flex size-12 items-center justify-center rounded-2xl shadow-sm ${game.iconClass}`}
      >
        {game.icon}
      </span>
      <h3 className="font-display text-xl font-semibold tracking-tight">
        {game.name}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
        {game.description}
      </p>
      <div className="mt-5 flex items-center justify-between">
        <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
          {game.minPlayers === game.maxPlayers
            ? game.maxPlayers
            : `${game.minPlayers}–${game.maxPlayers}`}{" "}
          {t.home.players}
        </span>

        {group ? (
          // Logged into a group: choose where this game is saved.
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {t.home.newGame}
            <ArrowIcon />
          </button>
        ) : (
          // No group: a temporary game, created straight away.
          <fetcher.Form method="post">
            <input type="hidden" name="gameType" value={game.slug} />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t.home.newGame}
              <ArrowIcon />
            </button>
          </fetcher.Form>
        )}
      </div>

      {group && (
        <SaveWhereModal
          open={choosing}
          onClose={() => setChoosing(false)}
          game={game}
          group={group}
        />
      )}
    </Card>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

/**
 * When you're in a group, a new game can be temporary (no group) or saved to
 * the current group. Saving to the group takes you to the lobby where players
 * are picked from — and added to — the roster. To play in a different group,
 * switch groups from the top-bar menu first.
 */
function SaveWhereModal({
  open,
  onClose,
  game,
  group,
}: {
  open: boolean;
  onClose: () => void;
  game: GameDefinition;
  group: CurrentGroup;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const go = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      navigate(`/game/${await fn()}`);
    } catch {
      alert(t.error.saveFailed);
      setBusy(false);
    }
  };

  const temporary = () => go(async () => (await createGame(game.slug)).code);

  const inCurrentGroup = () =>
    go(async () =>
      (await createGame(game.slug, { groupId: group.id })).code,
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={game.name}
      subtitle={t.home.saveWhereSubtitle}
    >
      <div className="space-y-2.5">
        <OptionButton
          title={t.home.temporaryGame}
          hint={t.home.temporaryGameHint}
          disabled={busy}
          onClick={temporary}
        />
        <OptionButton
          title={t.home.saveInGroup(group.name || t.group.unnamed)}
          hint={t.home.saveInGroupHint}
          disabled={busy}
          onClick={inCurrentGroup}
        />
      </div>
    </Modal>
  );
}

function OptionButton({
  title,
  hint,
  onClick,
  disabled,
}: {
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-field disabled:opacity-50"
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{hint}</span>
    </button>
  );
}
