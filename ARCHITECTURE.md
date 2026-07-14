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

## Gruppen

Kein Login, kein Passwort: In der Topbar tippt man einen **Gruppennamen** ein
(dazu optional ein **Geheimwort**) und ist in dieser Gruppe
([GroupMenu](app/components/layout/GroupMenu.tsx)). Es gibt keinen persönlichen
Namen mehr — die Gruppe *ist* die Identität. Schlüssel ist `(lower(name),
secret_hash)` (`groups`, unique darauf): derselbe Name mit **anderem** Geheimwort
ist eine **andere** Gruppe, so laufen fremde Runden mit gleichem Namen (oder
Ratende) nicht versehentlich zusammen. Gespeichert wird nur der md5-Hash des
Geheimworts, nie das Wort selbst. Beitreten ist **ein** Round-Trip: die RPC
`group_join(name, secret)` findet-oder-legt die Gruppe an und gibt sie zurück
(kein Mitglied wird automatisch eingetragen). Wer den Gruppen-Code/-Link kennt,
kommt über `/group/:code` ohne Geheimwort rein (wie bei Spielen). Die aktuelle
Gruppe steht lokal in localStorage
([app/lib/current-group.ts](app/lib/current-group.ts)); „Abmelden" löscht sie
nur dort. Weil die Startseite keine Supabase-Aufrufe macht, wäre der erste
DB-Treffer sonst ein Kaltstart — deshalb wärmt
[warmUpDatabase](app/lib/warmup.ts) die DB beim App-Start vor.

**Roster:** Kein Owner — **jeder** in der Gruppe darf Mitglieder hinzufügen
(`group_member_add`), umbenennen (`group_member_rename`), entfernen
(`group_member_remove`) und zusammenführen. Kein Auth: alles ist eine
UX-Leitplanke, keine echte Sicherheit.

Spiele einer Gruppe tragen `games.group_id`; Spieler werden erst in der Lobby
aus dem Roster gewählt (keine Vorbelegung mehr). In der Lobby eines Gruppenspiels
wählt man Spieler
**aus dem Roster** statt frei zu tippen
([GroupPlayerPicker](app/components/game/GroupPlayerPicker.tsx)); ein Feld fügt
einen neuen Namen dauerhaft zur Gruppe (und zum Spiel) hinzu. Die Gruppenseite
(`/group/:code`) lädt die Spiele und rechnet daraus Mitglieder, Rangliste, Siege
und die volle Spieleliste
([app/lib/group-stats.ts](app/lib/group-stats.ts)) — auch laufende und frische
Lobby-Spiele (mit „Lobby"-Badge). Die Seite aktualisiert sich live
([useRealtimeGroup](app/lib/use-realtime-group.ts) → revalidate bei Spiel-/
Mitglieder-Änderungen). Der Sieger je Spiel kommt aus
`GameDefinition.getWinnerIds` (fertiges Ergebnis oder aktueller Führender); die
Zuordnung zu Spielern läuft über den im Spiel eingetippten Namen. „Statistik
zurücksetzen" löscht die Spiele der Gruppe.

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
- **Immersiver Modus:** Während gespielt wird, setzt `routes/game.tsx`
  `html.immersive`. Auf einem quer gehaltenen Handy (Landscape, niedrige Höhe)
  blendet CSS ([app/app.css](app/app.css)) Header/Footer/Titel aus und lässt
  das Board den ganzen Screen füllen; Portrait und größere Screens bleiben
  unberührt.

## Ein neues Spiel hinzufügen

**Rundenbasiert (der Normalfall — Rommé, Uno, Skyjo, Hearts, …):** meist
reicht der Punkteblock mit passendem Limit — dafür **keine** neue Datei
anlegen, sondern eine Vorlage in `PRESETS`
([app/games/punkte/index.tsx](app/games/punkte/index.tsx)) ergänzen (Limit +
Gewinn-/Verlust-Regel). Braucht das Spiel eigene Regeln (z. B. eine
Ansage-Phase, Bonuspunkte, ein Zusatzfeld pro Runde), nutze
`defineRoundsGame(meta, config)`
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
