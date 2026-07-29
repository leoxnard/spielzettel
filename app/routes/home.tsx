import { data, redirect } from "react-router";

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
        <JoinByCode />
      </div>
      <div className="mt-8">
        <FinishedGames />
      </div>
    </main>
  );
}
