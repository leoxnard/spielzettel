# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## What this is

**Spielzettel** — a collaborative digital score sheet for board/card game
nights. Pick a game, share a 5-character code or link, everyone at the table
writes on the same sheet live. **No accounts, no auth**: knowing the game code
is the only permission there is.

The product surface is **German-only**. All user-visible copy lives in
`app/i18n/de.ts`; code, comments and commit messages are English.

## Stack

- **React Router 8** in Framework Mode (SSR on, `react-router.config.ts`) + React 19
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config`, tokens are
  CSS variables in `app/app.css` exposed through `@theme inline`
- **Supabase** (Postgres + Realtime) — client in `app/lib/supabase.ts`
- **Vitest** for pure scoring logic (`app/**/*.test.ts`)
- **Vercel Analytics**; Docker deploy (`Dockerfile`, port 3000)

TypeScript is `strict` with `verbatimModuleSyntax`. Path alias: `~/*` → `app/*`
(configured in both `tsconfig.json` and `vitest.config.ts`).

## Commands

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm install`       | Install deps (`node_modules` is not committed) |
| `npm run dev`       | Dev server with HMR on http://localhost:5173  |
| `npm test`          | Vitest run (scoring logic)                     |
| `npm run typecheck` | `react-router typegen && tsc`                  |
| `npm run build`     | Production build                               |
| `npm start`         | Serve `build/server/index.js`                  |

**Before finishing any change: `npm run typecheck`, `npm test` and
`npm run build` must all be green.** There is no linter or formatter
configured — match the surrounding style (2-space indent, double quotes,
semicolons, trailing commas).

`typecheck` runs `react-router typegen` first because route modules import
generated types from `./+types/<route>`; those types do not exist until typegen
has run in a fresh checkout.

## Environment

`.env` (from `.env.example`) needs:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`app/lib/supabase.ts` throws at import time if either is missing, so nearly
everything fails without them. Vite **inlines** these at build time — they must
be present when `npm run build` runs, not just at runtime.

The database is a **self-hosted** Supabase stack (Postgres + PostgREST +
Realtime + Caddy), defined in `infra/supabase-lite/` and deployed as a Docker
Compose resource in Coolify. SQL in `supabase/migrations/` is applied manually,
in order, with `psql -v ON_ERROR_STOP=1 -f`; files are numbered and append-only
— **add a new `00NN_*.sql`, never edit an applied one**, with one exception:
a migration that cannot replay against an empty database is broken and must be
made replayable (see the `drop function` in `0009`).

## Layout

```
app/
├── routes.ts            # route table (config-based, not file-based)
├── root.tsx             # html shell, theme script, analytics
├── app.css              # design tokens + animations + immersive-mode CSS
├── routes/              # home, game/:code, group/:code, impressum, robots, sitemap
├── i18n/de.ts           # ALL user-visible strings, namespaced
├── lib/                 # supabase client, APIs, realtime hooks, localStorage, seo
├── components/
│   ├── ui/              # generic (Button, Card, Modal, Stepper, NumericKeypad…)
│   ├── layout/          # Header, Footer, Logo, ThemeToggle, GroupMenu
│   ├── home/            # Hero, GameGrid, JoinByCode, RecentGames
│   └── game/            # game-agnostic: Lobby, PlayerList, ShareCode, pickers
└── games/
    ├── types.ts         # the GameDefinition contract
    ├── registry.ts      # GAMES array (home-page order)
    ├── rounds/          # shared engine for round-based games
    └── <slug>/          # one folder per game
supabase/migrations/     # append-only SQL (tables + RPCs)
infra/supabase-lite/     # self-hosted Postgres/PostgREST/Realtime for Coolify
.agents/skills/react-router/  # React Router reference docs — consult for routing work
```

Rule of thumb: **keep files small**. Route modules orchestrate only; logic lives
in `lib/` or the game folder, UI in `components/`.

## Data model (one table)

`public.games` — one row per score sheet:

- `code` — 5 chars `[A-Z2-9]`, unique, the URL param (`/game/K7QF2`)
- `game_type` — matches a `GameDefinition.slug`
- `status` — `lobby` → `playing` → `finished`
- `players` — jsonb `[{ id, name, color }]`
- `state` — jsonb, game-specific
- `group_id` — optional link to `public.groups`

`public.groups` — name + optional secret (md5 hash stored, never the word),
`members` jsonb roster, own share `code`. Identity is `(lower(name),
secret_hash)`: same name + different secret = a *different* group. Group
membership is stored client-side in `localStorage` (`app/lib/current-group.ts`);
"logging out" only clears that.

### Concurrency — never write the whole state blob

Score writes go through RPCs, each a single atomic `UPDATE`:

| RPC                                      | Use                                                   |
| ---------------------------------------- | ----------------------------------------------------- |
| `set_state_at(game_id, path, value)`     | single cell / scalar; `null` clears the path           |
| `merge_state_at(game_id, path, value)`   | shallow-merge an object (rounds: one key per player)   |
| `merge_player(game_id, player_id, patch)`| patch one player in the `players` array (name/color)   |

Wrappers live in `app/lib/game-api.ts`. Boards **never** call Supabase directly
— they receive `setStateAt` / `mergeStateAt` as props (see `GameBoardProps`).
Whole-array/whole-row writes (`updateGame`) are reserved for low-contention
lobby actions: adding/removing/reordering players, status changes, title.

Same cell + same player stays last-write-wins on purpose. Boards optimistically
overlay pending writes until realtime confirms.

### Realtime + SSR

- `routes/game.tsx` / `routes/group.tsx` load the row in a server `loader`
  (real HTML on first paint, 404 for unknown codes).
- `use-realtime-game.ts` subscribes to `postgres_changes` UPDATEs, refetches
  once on `SUBSCRIBED` (closes the SSR-snapshot gap), on reconnect and on tab
  re-focus; stale payloads are dropped by comparing `updated_at`.
- `use-realtime-group.ts` revalidates the group route on game/member changes.
- Mutations go straight through supabase-js from the client. The one exception
  is creating a game: a react-router `action` on `/` that redirects to the lobby.
- `warmUpDatabase()` (`app/lib/warmup.ts`) pings Supabase at app start because
  the home page otherwise makes no DB calls and the first real query would eat a
  cold start. Self-hosted Postgres doesn't auto-pause the way the hosted
  project did, so this now only warms the connection, not a sleeping instance.

## Adding a game

Decide which of three tiers applies — pick the cheapest one that fits:

1. **Just "points per round + a limit"** (Rommé, Uno, Skyjo, Hearts, Canasta,
   6 nimmt!, Flip 7, Cabo, Yaniv, Skat…): **do not create a folder.** Add a
   preset to `PRESETS` in `app/games/punkte/index.tsx` (limit + win/lose rule).
2. **Round-based with own rules** (bidding phase, bonus points, an extra field
   per round): call `defineRoundsGame(meta, config)` from
   `app/games/rounds/defineRoundsGame.tsx`. You supply metadata, scoring
   (`roundScore`, optionally `totalScore`, `maxRounds`, `verdict`,
   `roundWarning`), an `EntryEditor` and optionally a `SettingsPanel`. Tabs,
   round submit/undo, turn-order chip, winner banner and totals table come from
   the shared `RoundsBoard`. Examples: `wizard/`, `spades/`, `phase10/`.
3. **Own mechanic**: implement `GameDefinition` (`app/games/types.ts`) directly —
   like `kniffel/` (cell grid) or `stadtlandfluss/` (write → score → done
   phases, per-device identity in localStorage).

Always, regardless of tier:

1. Folder `app/games/<slug>/`; strings under their own namespace in `i18n/de.ts`.
2. Pure scoring functions in `scoring.ts` (or `logic.ts`) + `scoring.test.ts`.
3. Register in `app/games/registry.ts` — done. Home card, lobby (lucky wheel,
   turn order, settings slot), code sharing, realtime and group stats all come
   from the contract.

`getWinnerIds` matters beyond the board: group leaderboards use it (final winner
if decided, current leader otherwise, ties return everyone). `groupLabel` lets a
game report a finer bucket than its name (Punkteblock reports the chosen preset).

## Conventions

- **Strings**: no literals in components — everything through `t` from
  `~/i18n/de`, namespaced per feature/game. A second language later = one new
  file, not a component sweep.
- **Colors**: only semantic tokens (`bg-background`, `text-ink`, `bg-primary`,
  `accent`, `field`, `border`, `danger`, …). **Never raw hex/Tailwind palette
  colors in components.** A game's identity comes from `iconClass`, not new
  globals. Full table in `DESIGN.md`.
- **Typography**: `font-display` (Fraunces) for headlines/names/sums,
  `font-sans` (Inter) default, `font-mono tracking-[0.2em]` for codes, section
  labels `text-[11px] font-semibold uppercase tracking-wider`.
- **Shape**: cards `rounded-3xl`, inputs/buttons `rounded-xl`, pills
  `rounded-full`, page width `max-w-3xl px-4`, touch targets ≥ 44px (`h-11`).
- **Class names**: compose with `cx()` from `~/lib/cx`.
- **Overlays**: always use the `Modal` component (portals to `<body>`). Building
  one inline breaks under `transform`-based animations, which turn ancestors into
  containing blocks for `position: fixed`.
- **Motion**: `animate-fade-in-up`, `animate-sheet-in`/`animate-pop-in`,
  `animate-live-pulse`; all disabled globally by `prefers-reduced-motion`. No
  scroll triggers, no parallax.
- **Theme**: `.dark` class on `<html>`, set pre-paint by `THEME_SCRIPT`
  (`app/lib/theme.ts`), preference in `localStorage.theme`, system fallback.
  Components never branch on the mode.
- **Immersive mode**: while playing, `routes/game.tsx` sets `html.immersive`; CSS
  in `app.css` hides chrome on landscape phones only.
- **SEO**: build meta with `pageMeta()` from `~/lib/seo`; private/dynamic pages
  (a running game or group) pass `noindex`.
- **Tone of copy**: German "du", direct and friendly, verbs over marketing —
  buttons say what happens ("Block starten", not "Los geht's").

## Docs to keep in sync

- `README.md` — setup, scripts, game list
- `ARCHITECTURE.md` — data model, realtime patterns, "new game in 5 steps"
- `DESIGN.md` — tokens, typography, motion; **binding** — changing a rule means
  editing this file first
- This file — update it when structure, workflows or conventions change

## Git

Commit messages follow `feat: …` / `fix: …` (Conventional Commits style,
lowercase, English). Work on a feature branch; do not commit `.env`,
`node_modules/`, `build/` or `.react-router/`.
