import { useState } from "react";
import { useNavigate } from "react-router";

import type { CatalogGame } from "~/catalog/types";
import { Button } from "~/components/ui/Button";
import { presetSettings } from "~/games/punkte";
import { getGame } from "~/games/registry";
import { t } from "~/i18n/de";
import { useCurrentGroup } from "~/lib/current-group";
import { createGame } from "~/lib/game-api";
import type { Json } from "~/lib/types";

/** Creates a score sheet for a catalog game, pre-set where a preset exists. */
export function StartSheetButton({ sheet }: { sheet: NonNullable<CatalogGame["sheet"]> }) {
  const navigate = useNavigate();
  const group = useCurrentGroup();
  const [busy, setBusy] = useState(false);
  const definition = getGame(sheet.game);
  if (!definition) return null;

  const start = async (groupId?: string) => {
    setBusy(true);
    try {
      const settings = sheet.preset ? presetSettings(sheet.preset) : null;
      const game = await createGame(sheet.game, {
        groupId,
        state: settings ? { settings: settings as unknown as Json } : undefined,
      });
      navigate(`/game/${game.code}`);
    } catch {
      alert(t.error.saveFailed);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="accent" size="lg" disabled={busy} onClick={() => start()}>
        {t.catalog.startSheet}
        <span className="font-normal opacity-80">· {definition.name}</span>
      </Button>
      {group && (
        <Button
          variant="secondary"
          size="lg"
          disabled={busy}
          onClick={() => start(group.id)}
        >
          {t.home.saveInGroup(group.name || t.group.unnamed)}
        </Button>
      )}
    </div>
  );
}
