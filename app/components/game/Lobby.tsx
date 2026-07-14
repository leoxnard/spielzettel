import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Collapsible } from "~/components/ui/Collapsible";
import { Input } from "~/components/ui/Input";
import { Switch } from "~/components/ui/Switch";
import { t } from "~/i18n/de";
import { mergePlayer, mergeStateAt, updateGame } from "~/lib/game-api";
import type { GameRow, GroupRow, Json, Player } from "~/lib/types";
import type { BaseSettings, GameDefinition } from "~/games/types";
import { GroupPlayerPicker } from "./GroupPlayerPicker";
import { PlayerList, newPlayer } from "./PlayerList";
import { StartPlayerPicker } from "./StartPlayerPicker";

interface LobbyProps {
  game: GameRow;
  definition: GameDefinition;
  group?: GroupRow | null;
}

export function Lobby({ game, definition, group }: LobbyProps) {
  const [starting, setStarting] = useState(false);

  // Seed the minimum player count once for a freshly created game — but not
  // for group games, where players are chosen from the roster (no blanks).
  const seeded = useRef(false);
  useEffect(() => {
    if (group) return;
    if (seeded.current || game.players.length >= definition.minPlayers) return;
    seeded.current = true;
    const players = [...game.players];
    while (players.length < Math.max(definition.minPlayers, 2)) {
      players.push(newPlayer(players.length));
    }
    updateGame(game.id, { players }).catch(() => {});
  }, [group, game.id, game.players.length, definition.minPlayers]);

  // Title: local draft, saved debounced so we don't write on every key.
  const [title, setTitle] = useState(game.title ?? "");
  const titleFocused = useRef(false);
  useEffect(() => {
    if (!titleFocused.current) setTitle(game.title ?? "");
  }, [game.title]);
  const saveTitle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onTitleChange = (value: string) => {
    setTitle(value);
    clearTimeout(saveTitle.current);
    saveTitle.current = setTimeout(() => {
      updateGame(game.id, { title: value.trim() || null }).catch(() => {});
    }, 500);
  };

  const setPlayers = (players: Player[]) => {
    updateGame(game.id, { players }).catch(() => {});
  };

  // Lobby-edited settings live in state.settings even before the game
  // starts; merged over the game's defaults. An optimistic overlay makes
  // toggles/inputs feel instant instead of waiting for the realtime echo:
  // a patched key is shown immediately and dropped once the server confirms
  // the same value (so another device's change still comes through live).
  const [settingsOverlay, setSettingsOverlay] = useState<
    Record<string, unknown>
  >({});
  const serverSettings =
    (game.state.settings as Record<string, unknown> | undefined) ?? {};
  useEffect(() => {
    setSettingsOverlay((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (JSON.stringify(serverSettings[key]) === JSON.stringify(next[key])) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state.settings]);

  const settings: BaseSettings & Record<string, unknown> = {
    ...definition.defaultSettings,
    ...serverSettings,
    ...settingsOverlay,
  };
  const patchSettings = (patch: Record<string, unknown>) => {
    setSettingsOverlay((prev) => ({ ...prev, ...patch }));
    mergeStateAt(game.id, ["settings"], patch as Record<string, Json>).catch(
      () => {
        // Save failed — drop the optimistic keys so the UI reflects reality.
        setSettingsOverlay((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(patch)) {
            if (JSON.stringify(next[key]) === JSON.stringify(patch[key])) {
              delete next[key];
            }
          }
          return next;
        });
      },
    );
  };

  const start = async () => {
    setStarting(true);
    try {
      const players = game.players.map((p, i) => ({
        ...p,
        name: p.name.trim() || t.lobby.defaultPlayerName(i + 1),
      }));
      // A fresh game gets initial state; re-starting after a lobby visit
      // keeps existing scores and only adds entries for new players.
      const state = definition.hasStarted(game.state)
        ? definition.mergeStateForPlayers(game.state, players)
        : definition.createInitialState(players, settings);
      await updateGame(game.id, { players, state, status: "playing" });
    } catch {
      alert(t.error.saveFailed);
      setStarting(false);
    }
  };

  const SettingsPanel = definition.SettingsPanel;

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <label className="mb-1.5 block text-sm font-medium" htmlFor="game-title">
          {t.lobby.titleLabel}{" "}
          <span className="font-normal text-muted">{t.lobby.titleOptional}</span>
        </label>
        <Input
          id="game-title"
          value={title}
          placeholder="Spieleabend"
          maxLength={60}
          onFocus={() => (titleFocused.current = true)}
          onBlur={() => (titleFocused.current = false)}
          onChange={(e) => onTitleChange(e.target.value)}
        />

        <div className="mt-6">
          {group ? (
            <GroupPlayerPicker
              group={group}
              players={game.players}
              maxPlayers={definition.maxPlayers}
              onChange={setPlayers}
            />
          ) : (
            <PlayerList
              players={game.players}
              minPlayers={definition.minPlayers}
              maxPlayers={definition.maxPlayers}
              onChange={setPlayers}
              onPatchPlayer={(id, patch) =>
                mergePlayer(game.id, id, patch).catch(() => {})
              }
            />
          )}
        </div>

        {game.players.length > 1 && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t.lobby.showTurnOrder}</p>
                <p className="text-xs text-muted">
                  {definition.supportsTurnOrder
                    ? t.lobby.showTurnOrderHint
                    : t.lobby.showStartPlayerHint}
                </p>
              </div>
              <Switch
                checked={!!settings.showTurnOrder}
                onChange={(showTurnOrder) => patchSettings({ showTurnOrder })}
                label={t.lobby.showTurnOrder}
              />
            </div>
            {settings.showTurnOrder && (
              <div className="mt-4">
                <StartPlayerPicker
                  players={game.players}
                  startPlayerId={settings.startPlayerId}
                  onPick={(startPlayerId) => patchSettings({ startPlayerId })}
                />
              </div>
            )}
          </div>
        )}

        {SettingsPanel && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="mb-3 font-display text-base font-semibold">
              {t.lobby.settingsLabel}
            </p>
            <SettingsPanel
              settings={settings}
              players={game.players}
              patchSettings={patchSettings}
            />
          </div>
        )}

        <Button
          variant="accent"
          size="lg"
          className="mt-6 w-full"
          onClick={start}
          disabled={starting || game.players.length < definition.minPlayers}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          {t.lobby.start}
        </Button>
        <p className="mt-3 text-center text-xs text-muted">{t.lobby.startHint}</p>
      </Card>

      <Collapsible summary={t.lobby.howItWorks}>
        <ul className="list-disc space-y-1.5 pl-5">
          {definition.howItWorks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Collapsible>
    </div>
  );
}
