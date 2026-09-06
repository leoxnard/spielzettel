-- Realtime connects with `SET search_path TO _realtime` and runs its own
-- migrations there, but it does not create the schema itself.
create schema if not exists _realtime;
alter schema _realtime owner to supabase_admin;

-- The migrations in supabase/migrations/ do
-- `alter publication supabase_realtime add table ...`, which needs the
-- publication to already exist. CREATE PUBLICATION has no IF NOT EXISTS,
-- hence the guard.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;
