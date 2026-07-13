import { useFetcher } from "react-router";

import { Card } from "~/components/ui/Card";
import { GAMES } from "~/games/registry";
import type { GameDefinition } from "~/games/types";
import { t } from "~/i18n/de";

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
  const fetcher = useFetcher();
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
        <fetcher.Form method="post">
          <input type="hidden" name="gameType" value={game.slug} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {t.home.newGame}
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
          </button>
        </fetcher.Form>
      </div>
    </Card>
  );
}
