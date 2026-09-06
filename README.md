# Spielzettel

Der digitale Punktezettel für den Spieleabend: Spiel wählen, Runde per
Code/Link teilen, gemeinsam live mitschreiben — auf jedem Gerät, ohne Konto.

Implementierte Spiele: **Punkteblock** (universell, mit Vorlagen für Rommé,
Uno, Mau-Mau, Skyjo, Hearts, Canasta, 6 nimmt!, Flip 7, Cabo, Yaniv,
Zehntausend, Skat, Schafkopf, Doppelkopf & Co. – optionale Rundensummen-Prüfung),
**Kniffel**, **Wizard**, **Phase 10**, **Stadt Land Fluss** (live tippen!),
**Spades**. Neue Spiele sind über das Registry-System schnell ergänzt
(siehe [ARCHITECTURE.md](ARCHITECTURE.md)).

## Stack

- [React Router 8](https://reactrouter.com/) (Framework-Modus, SSR) + React 19
- [Tailwind CSS v4](https://tailwindcss.com/) — Tokens in [DESIGN.md](DESIGN.md)
- [Supabase](https://supabase.com/) — Postgres + Realtime für Live-Sync,
  selbst gehostet ([infra/supabase-lite/](infra/supabase-lite/README.md))
- Vitest für die Punktelogik

## Setup

```bash
npm install
cp .env.example .env   # Supabase-URL + Publishable Key eintragen
npm run dev            # http://localhost:5173
```

Das Datenbankschema liegt in [supabase/migrations/](supabase/migrations/) und
wird einmalig der Reihe nach auf die Datenbank angewendet (`psql -f`, pro
Datei, mit `ON_ERROR_STOP=1`).

Die Datenbank ist ein selbst gehosteter Supabase-Stack — Postgres, PostgREST
und Realtime, siehe [infra/supabase-lite/](infra/supabase-lite/README.md).

## Scripts

| Befehl              | Zweck                                |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev-Server mit HMR                   |
| `npm test`          | Unit-Tests (Punktelogik)             |
| `npm run typecheck` | Typegen + TypeScript                 |
| `npm run build`     | Produktions-Build                    |
| `npm run start`     | Build servieren (`build/server`)     |

## Deployment

Docker-ready (`Dockerfile`, Port 3000) — läuft überall, wo Node-Container
laufen. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` müssen zur
**Build-Zeit** gesetzt sein (Vite inlined sie).

## Dokumentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Datenmodell, Realtime-Muster, „neues Spiel in 5 Schritten"
- [DESIGN.md](DESIGN.md) — Farb-Tokens, Typografie, Motion-Regeln
