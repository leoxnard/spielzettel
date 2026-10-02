import { useState } from "react";

import { deviceId, setMyRating, useMyRatings } from "~/catalog/favorites";
import { rateGame, type RatingStats } from "~/catalog/ratings";
import { t } from "~/i18n/de";
import { StarDisplay, StarInput } from "./Stars";

export function RatingPanel({
  slug,
  initial,
}: {
  slug: string;
  initial: RatingStats | null;
}) {
  const [stats, setStats] = useState(initial ?? { avg: 0, count: 0 });
  const mine = useMyRatings()[slug] ?? null;
  const [busy, setBusy] = useState(false);

  const rate = async (stars: number | null) => {
    const previous = mine;
    setMyRating(slug, stars);
    setBusy(true);
    try {
      setStats(await rateGame(slug, deviceId(), stars));
    } catch {
      setMyRating(slug, previous);
      alert(t.catalog.rateFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.catalog.ratingLabel}
        </span>
        {stats.count > 0 ? (
          <StarDisplay avg={stats.avg} count={stats.count} size="md" />
        ) : (
          <span className="text-sm text-muted">{t.catalog.noRatings}</span>
        )}
      </div>
      <div className="text-right">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.catalog.yourRating}
        </span>
        <StarInput value={mine} onChange={rate} disabled={busy} />
        {mine !== null ? (
          <button
            type="button"
            onClick={() => rate(null)}
            disabled={busy}
            className="block w-full text-right text-xs text-muted underline-offset-2 hover:underline"
          >
            {t.catalog.removeRating}
          </button>
        ) : (
          <p className="text-xs text-muted">{t.catalog.rateHint}</p>
        )}
      </div>
    </div>
  );
}
