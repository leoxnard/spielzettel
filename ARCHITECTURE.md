# Architektur

React Router 8 (Framework-Modus, SSR) + Tailwind v4 + Supabase (Postgres +
Realtime). Kein Auth: Wer den 5-stelligen Spiel-Code kennt, darf mitschreiben.

## Ordnerstruktur

```
app/
├── routes/          # home.tsx (/), game.tsx (/game/:code)
├── i18n/de.ts       # ALLE UI-Strings, zentral
├── lib/             # Supabase-Client, Game-API, Codes, Theme, Hooks
├── components/
│   ├── ui/          # generische Bausteine (Button, Card, Modal, …)
│   ├── layout/      # Header, Footer, Logo, ThemeToggle
│   ├── home/        # Hero, GameGrid, JoinByCode, RecentGames
│   └── game/        # spielunabhängig: Lobby, PlayerList, ShareCode
└── games/
    ├── types.ts     # GameDefinition-Vertrag
    ├── registry.ts  # Liste aller Spiele
    └── kniffel/     # ein Ordner pro Spiel
```

Faustregel: Dateien klein halten. Route-Module orchestrieren nur; Logik liegt
in `lib/` bzw. im Spiel-Ordner, UI in `components/`.

## Datenmodell

Eine Tabelle `public.games` (siehe
[supabase/migrations/0001_games.sql](supabase/migrations/0001_games.sql)):

- `code` — 5 Zeichen, eindeutig, URL-Parameter (`/game/KFJSRK`)
- `status` — `lobby` → `playing` (→ `finished` reserviert)
- `players` — jsonb `[{ id, name, color }]`
- `state` — jsonb, spielspezifisch. Kniffel:
  `{ scores: { [playerId]: { ones: 3, kniffel: 50, … } } }`
  (Wert `0` = gestrichen, fehlender Schlüssel = offen)

### Nebenläufigkeit

Spielstände werden **nie** als ganzer Blob geschrieben. Drei RPCs (alle ein
atomares UPDATE pro Zeile, siehe `supabase/migrations/`):

- `set_state_at(game_id, path, value)` — `jsonb_set` an einem Pfad;
  `null` löscht ihn. Für Einzelzellen (Kniffel) und Skalare (`currentRound`).
- `merge_state_at(game_id, path, value)` — shallow-Merge eines Objekts am
  Pfad (legt ihn bei Bedarf an). Rundenspiele schreiben Einträge als
  `merge_state_at(['rounds','3'], {"<playerId>": …})` — zwei Spieler in
  derselben Runde überschreiben sich nie.
- `merge_player(game_id, player_id, patch)` — patcht einen Spieler im
  `players`-Array (Name/Farbe). Wichtig, weil in der Lobby alle gleichzeitig
  den eigenen Namen tippen. Hinzufügen/Entfernen/Umsortieren schreiben
  weiterhin das ganze Array (seltene Host-Aktionen).

Gleiche Zelle/gleicher Spieler bleibt bewusst Last-Write-Wins. Boards
überlagern schwebende Schreibvorgänge optimistisch, bis Realtime bestätigt.

### Realtime + SSR

- `routes/game.tsx` lädt die Zeile im Server-`loader` (echtes HTML beim ersten
  Paint, 404 bei unbekanntem Code).
- [use-realtime-game.ts](app/lib/use-realtime-game.ts) abonniert
  `postgres_changes`-UPDATEs, refetcht einmal bei `SUBSCRIBED` (schließt die
  Lücke zwischen SSR-Snapshot und Abo-Start), bei Reconnect und wenn der Tab
  wieder sichtbar wird; ältere Payloads (per `updated_at`) werden verworfen.
- Mutationen gehen direkt über supabase-js; einzige Ausnahme ist das Anlegen
  eines Spiels (react-router `action` auf `/` → Redirect zur Lobby).

## Ein neues Spiel hinzufügen

**Rundenbasiert (der Normalfall — Rommé, Uno, Skyjo, Hearts, …):** meist
reicht der Punkteblock mit passendem Limit. Braucht das Spiel eigene Regeln,
nutze `defineRoundsGame(meta, config)`
([app/games/rounds/defineRoundsGame.tsx](app/games/rounds/defineRoundsGame.tsx)):
Du lieferst nur Metadaten, Scoring-Regeln (`roundScore`, optional
`totalScore`, `maxRounds`, `verdict`), einen `EntryEditor` und optional ein
`SettingsPanel`. Tabs („Aktuelle Runde"/„Gesamt"), Runde abschließen/
zurücknehmen, Startspieler-/Geber-Chip, Sieger-Banner und Totals-Tabelle
kommen aus der gemeinsamen [RoundsBoard](app/games/rounds/RoundsBoard.tsx).
Beispiele: `wizard/` (Ansage+Stiche, feste Rundenzahl), `spades/` (Bags via
`totalScore`), `phase10/` (Zusatz-Feld + eigener `verdict`).

**Frei (eigene Mechanik):** `GameDefinition` direkt implementieren
([app/games/types.ts](app/games/types.ts)) — wie `kniffel/` (Zellen-Board)
oder `stadtlandfluss/` (Phasen: schreiben → werten → fertig, Identität pro
Gerät in localStorage).

Immer gleich:
1. Ordner `app/games/<slug>/`, Strings unter eigenem Namespace in
   [app/i18n/de.ts](app/i18n/de.ts).
2. Reine Punktelogik als pure Funktionen + Vitest-Tests (`scoring.test.ts`).
3. In [app/games/registry.ts](app/games/registry.ts) registrieren — fertig.
   Home-Karte, Lobby (inkl. Glücksrad, Reihenfolge, Settings-Slot),
   Code-Sharing und Realtime funktionieren automatisch über den Vertrag.

## Konventionen

- Alle UI-Strings in `i18n/de.ts` (zweite Sprache später = eine neue Datei).
- Semantische Farb-Tokens statt Roh-Farben (siehe [DESIGN.md](DESIGN.md)).
- `npm run typecheck`, `npm test`, `npm run build` müssen grün sein.
