-- The supabase/postgres image creates these roles but leaves their
-- passwords unset, so PostgREST (which connects as `authenticator`) can't
-- log in until they match POSTGRES_PASSWORD. The official stack does this
-- in volumes/db/roles.sql; same thing, minus the roles for the services
-- this trimmed stack doesn't run.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
