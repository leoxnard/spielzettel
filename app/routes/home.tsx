import { data, Link, redirect } from "react-router";

import type { Route } from "./+types/home";
import { GameGrid } from "~/components/home/GameGrid";
import { Hero } from "~/components/home/Hero";
import { JoinByCode } from "~/components/home/JoinByCode";
import { ActiveGames, FinishedGames } from "~/components/home/RecentGames";
import { getGame } from "~/games/registry";
import { t } from "~/i18n/de";
import { createGame } from "~/lib/game-api";
import { pageMeta, SITE_URL } from "~/lib/seo";

export function meta({}: Route.MetaArgs) {
  const title = `${t.app.name} – ${t.app.tagline}`;
  const description = t.home.subline;
  return [
    ...pageMeta({ title, description, path: "/" }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t.app.name,
        description,
        url: SITE_URL,
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        inLanguage: "de",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const slug = String(form.get("gameType") ?? "");
  if (!getGame(slug)) {
    throw data(null, { status: 400 });
  }
  const game = await createGame(slug);
  return redirect(`/game/${game.code}`);
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12">
      <Hero />
      <div className="space-y-8">
        <ActiveGames />
        <GameGrid />
        <Link
          to="/katalog"
          className="group flex items-center gap-4 rounded-3xl border border-border/60 bg-primary-soft p-6 transition-colors hover:border-primary/40"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-ink shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="11" height="16" rx="2" />
              <path d="m14 7 4.5 1.2a2 2 0 0 1 1.4 2.4l-2.3 8.7a2 2 0 0 1-2.4 1.4L12 20" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block font-display text-xl font-semibold tracking-tight">
              {t.catalog.teaserTitle}
            </span>
            <span className="mt-0.5 block text-sm text-muted">{t.catalog.teaserText}</span>
          </span>
          <span className="hidden text-sm font-semibold text-primary sm:inline">
            {t.catalog.teaserCta} →
          </span>
        </Link>
        <JoinByCode />
      </div>
      <div className="mt-8">
        <FinishedGames />
      </div>
    </main>
  );
}
