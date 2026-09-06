# supabase-lite

A trimmed self-hosted Supabase stack for Spielzettel: **Postgres +
PostgREST + Realtime + Caddy**, ~430 MB idle (measured) across four
containers instead of the ~15 the official compose file starts.

Spielzettel has no accounts and no file storage, so this drops GoTrue,
Storage, imgproxy, Studio, Supavisor and the Logflare/Vector analytics
pipeline entirely, and uses Caddy (14 MB) instead of Kong/Envoy as the
gateway — the app only needs two paths routed under one origin.

Verified end-to-end against this stack with the app's own
`@supabase/supabase-js`: all 12 migrations replay from scratch, REST
insert, the `set_state_at` RPC, and a `postgres_changes` subscription
receiving live UPDATEs.

Not a general-purpose Supabase replacement: no dashboard, no auth, no
storage. If a future game needs uploads or per-user accounts, switch to
the official one-click Supabase template instead.

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

1. In the **Spielzettel** project: **+ New Resource → Docker Compose**,
   pointed at this repo with base directory `infra/supabase-lite`. Deploy
   it from the repo rather than pasting the compose file — `Caddyfile` and
   `init/*.sql` are bind-mounted next to it and a pasted-only compose has
   nothing to mount.
2. Add the six variables from `.env` as the resource's environment
   variables.
3. Deploy, then set the **domain on the `caddy` service, port 8000**, to a
   subdomain distinct from the app itself, e.g.
   `supabase.spielzettel.leonardsima.de`. Add a DNS `A` record pointing at
   the same public IP as `spielzettel.leonardsima.de`; Coolify's Traefik
   issues the certificate. HTTPS matters here — Realtime needs WSS.
4. Only `caddy` is exposed. `db`, `rest` and `realtime` publish no ports
   and stay on the internal network.

## 3. Run the migrations

```bash
for f in ../../supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -U postgres -f "$f"
done
```

Run it from inside the `db` container (Coolify's terminal for that
service) so Postgres never has to be exposed. `ON_ERROR_STOP=1` matters —
without it psql keeps going after a failed statement and leaves a
half-built schema that looks fine.

The migrations create the RLS policies and add both tables to the
`supabase_realtime` publication themselves; `init/99-realtime.sql` makes
sure that publication and the `_realtime` schema exist first.

## 4. Point the app at it

```
VITE_SUPABASE_URL=https://supabase.spielzettel.leonardsima.de
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Set these both in local `.env` and on the **Spielzettel** app resource in
Coolify — Vite inlines them at build time, so the app needs a rebuild, not
just a restart, before they take effect.

## Notes on the pieces

- **`init/99-roles.sql`** sets the `authenticator` password. The
  `supabase/postgres` image creates the role but leaves its password
  unset, so PostgREST cannot log in without this.
- **`init/99-realtime.sql`** creates the `_realtime` schema Realtime
  connects into (`SET search_path TO _realtime`), plus the
  `supabase_realtime` publication.
- **The `Host` rewrite in the Caddyfile is load-bearing.** Realtime takes
  its tenant id from the first label of the Host header and
  `SEED_SELF_HOST` seeds exactly one tenant, `realtime-dev`. Forwarding
  the public hostname makes it look for a tenant named `supabase` and
  refuse every connection. (Kong got away without this because it rewrites
  Host by default; Caddy preserves it.)
- **`PGRST_DB_ANON_ROLE` is deliberately unset.** The official stack sets
  it and lets Kong's key-auth turn away keyless requests. With no Kong and
  the fallback in place, a plain `curl` with no key at all is served as
  `anon`, which the RLS policies grant everything to. Unset, PostgREST
  returns 401 without a valid JWT.
- The **anon key is public by design** — it ships in the browser bundle.
  RLS is the real boundary, and it is deliberately open: anyone who can
  reach the API can read and write any game. That matches the hosted setup
  and the product ("knowing the game code is the only permission there
  is"), but it does mean this endpoint should not be treated as private.
  The **service role key bypasses RLS** — keep it out of the app.
- Image versions track the official compose file. Bump them together
  rather than one at a time:
  https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml
