import { Link } from "react-router";

import type { Route } from "./+types/impressum";
import { Card } from "~/components/ui/Card";
import { t } from "~/i18n/de";

export function meta({}: Route.MetaArgs) {
  return [{ title: `${t.impressum.title} · ${t.app.name}` }];
}

export default function Impressum() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10">
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.impressum.title}
        </h1>

        <div>
          <h2 className="text-lg font-semibold">{t.impressum.addressTitle}</h2>
          <p className="mt-1 text-muted">
            {t.impressum.name}
            <br />
            {t.impressum.street}
            <br />
            {t.impressum.cityLine}
            <br />
            {t.impressum.country}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{t.impressum.contactTitle}</h2>
          <p className="mt-1 text-muted">{t.impressum.email}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{t.impressum.hostingTitle}</h2>
          <p className="mt-1 text-muted">{t.impressum.hosting}</p>
        </div>

        <Link to="/" className="mt-2 text-sm font-medium text-primary hover:underline">
          {t.impressum.backToHome}
        </Link>
      </Card>
    </main>
  );
}
