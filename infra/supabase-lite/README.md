# supabase-lite

A trimmed self-hosted Supabase stack for Spielzettel: **Postgres +
PostgREST + Realtime + Caddy**, ~430 MB idle (measured) across four
running containers instead of the ~15 the official compose file starts.

Spielzettel has no accounts and no file storage, so this drops GoTrue,
Storage, imgproxy, Studio, Supavisor and the Logflare/Vector analytics
pipeline entirely, and uses Caddy (14 MB) instead of Kong/Envoy as the
gateway — the app only needs two paths routed under one origin.

Verified end-to-end with the app's own `@supabase/supabase-js`: all 12
migrations replay from scratch, REST insert, the `set_state_at` RPC, a
`postgres_changes` subscription receiving live UPDATEs, and a keyless
request correctly refused with 401.

Not a general-purpose Supabase replacement: no dashboard, no auth, no
storage. If a future game needs uploads or per-user accounts, switch to
the official one-click Supabase template instead.

## `docker-compose.yml` is deliberately standalone

No bind mounts, no files next to it. The Caddy config and the database
bootstrap are inlined into the compose file itself.

That is not a style choice. Coolify — and anything else that runs
`docker compose` from a helper container against the host's Docker socket
— materializes only the compose file on the host. Relative bind mounts are
resolved by the *host* daemon, so `./init/99-roles.sql` silently becomes an
empty **directory**: Postgres skips it without a word and Caddy dies trying
to mount a directory onto a file. That cost a full debugging session, so
keep this file self-contained.

A practical upside: it pastes into any "raw compose" box and still works.

## 1. Generate secrets

```bash
openssl rand -base64 32   # -> POSTGRES_PASSWORD
openssl rand -base64 32   # -> JWT_SECRET
openssl rand -hex 8       # -> DB_ENC_KEY  (must be exactly 16 chars)
openssl rand -base64 48   # -> SECRET_KEY_BASE
```

Then, with the `JWT_SECRET` from above:

```bash
./generate-secrets.sh '<your JWT_SECRET>'   # -> ANON_KEY, SERVICE_ROLE_KEY
```

Copy `.env.example` to `.env` and fill in all six values. (`.env` is
gitignored; `.env.example` is the committed template.)

## 2. Deploy in Coolify

1. **+ New Resource → Public Repository**, Build Pack **Docker Compose**,
   base directory `/infra/supabase-lite`.
2. Add the six variables from `.env` as the resource's environment
   variables. Without them the containers cannot start.
3. Deploy, then add a domain on the **`caddy`** service, port **8000**,
   protocol **https**. Traefik terminates TLS and proxies to Caddy over
   plain HTTP inside the Docker network.
4. Only `caddy` is exposed; `db`, `rest` and `realtime` publish no ports.

## 3. Run the migrations

```bash
for f in ../../supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -U postgres -f "$f"
done
```

Run it from inside the `db` container so Postgres never has to be exposed.
`ON_ERROR_STOP=1` matters — without it psql continues after a failed
statement and leaves a half-built schema that looks fine.

Afterwards, **give Realtime a minute** (or restart it). The migrations add
`games` and `groups` to the `supabase_realtime` publication, and a Realtime
instance that started before that happened needs a moment to notice. Live
updates arriving late right after a first deploy is this, not a bug.

## 4. Point the app at it

```
VITE_SUPABASE_URL=https://<your caddy domain>
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Set these both in local `.env` and on the Spielzettel app resource in
Coolify — Vite inlines them at build time, so the app needs a rebuild, not
just a restart.

## Notes on the pieces

- **`db-init`** runs to completion before `rest` and `realtime` may start
  (`condition: service_completed_successfully`). It sets the
  `authenticator` password, creates the `_realtime` schema, and ensures the
  `supabase_realtime` publication exists. It connects as `supabase_admin`,
  not `postgres` — in this image `postgres` is not a superuser and
  `authenticator` is a reserved role only a superuser may alter. Because it
  runs on every deploy rather than only on a fresh volume, it also repairs
  an existing database, unlike `/docker-entrypoint-initdb.d` scripts.
- **A half-initialized volume cannot be repaired in place.** The
  `supabase/postgres` image creates the `realtime` schema (the `subscription`
  table, `list_changes`, `apply_rls`) during its *first* init, and Postgres
  never re-runs init on a non-empty data directory. If that init was
  disrupted, Realtime still connects and reports `SUBSCRIBED`, then fails
  every WAL poll with `schema "realtime" does not exist` — live updates
  silently never arrive while everything else looks healthy. `db-init` now
  checks for it and refuses to let `rest`/`realtime` start. The only fix is
  to delete the `db-data` volume, redeploy, and re-run the migrations.
- **The `Host` rewrite in the Caddy config is load-bearing.** Realtime takes
  its tenant id from the first label of the Host header and `SEED_SELF_HOST`
  seeds exactly one tenant, `realtime-dev`. Forwarding the public hostname
  makes it look for a tenant named after your domain and refuse every
  connection. Caddy preserves the incoming Host by default, so it is set
  explicitly.
- **`PGRST_DB_ANON_ROLE` is deliberately unset.** The official stack sets it
  and lets Kong's key-auth turn away keyless requests. With no Kong and the
  fallback in place, a plain `curl` with no key at all is served as `anon`,
  which the RLS policies grant everything to. Unset, PostgREST returns 401
  without a valid JWT.
- The **anon key is public by design** — it ships in the browser bundle. RLS
  is the real boundary, and it is deliberately open: anyone who can reach
  the API can read and write any game. That matches the hosted setup and the
  product ("knowing the game code is the only permission there is"), but it
  does mean this endpoint should not be treated as private. The **service
  role key bypasses RLS** — keep it out of the app.
- Image versions track the official compose file. Bump them together rather
  than one at a time:
  https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml
