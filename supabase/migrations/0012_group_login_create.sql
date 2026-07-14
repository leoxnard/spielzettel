-- Split "join" into two explicit flows and make the group **name** the sole
-- identity:
--   * group_login  — enter an existing group by name (+ password if it has one)
--   * group_create — make a new group; fails if the name is already taken
-- The secret is no longer part of the identity — it's just a login password now,
-- so a name is globally unique. We also drop the redundant secret_hash column:
-- the plaintext `secret` is already stored (anon can read group rows), so the
-- hash added no real protection — it was only ever the matching key.

-- Name is now globally unique on its own.
drop index if exists groups_name_secret_unique;
create unique index if not exists groups_name_unique
  on public.groups (lower(name));

-- The hash is dead weight now that the secret isn't the identity key.
alter table public.groups drop column if exists secret_hash;

-- Old find-or-create entry point is replaced by login/create below.
drop function if exists public.group_join(text, text);

-- Enter an existing group. Look it up by name; a group WITH a secret requires
-- the matching word, a group WITHOUT one lets anyone in (any/empty password is
-- accepted — the login form still shows a password field for password managers).
-- Distinct SQLSTATEs let the client tell "no such group" from "wrong password".
create or replace function public.group_login(p_name text, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_name text := trim(p_name);
  v_secret text := trim(coalesce(p_secret, ''));
begin
  select * into g from public.groups
  where lower(name) = lower(v_name)
  limit 1;
  if not found then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if g.secret is not null and lower(g.secret) <> lower(v_secret) then
    raise exception 'wrong secret' using errcode = 'P0003';
  end if;
  return g;
end
$$;

-- Create a brand-new group. Fails with 23505 if the name is already taken.
-- Retries on the (rare) 5-letter code collision.
create or replace function public.group_create(p_name text, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_name text := trim(p_name);
  v_secret text := trim(coalesce(p_secret, ''));
  v_plain text := case when v_secret = '' then null else v_secret end;
  v_code text;
begin
  loop
    v_code := upper(array_to_string(array(
      select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                    floor(random() * 31 + 1)::int, 1)
      from generate_series(1, 5)
    ), ''));
    begin
      insert into public.groups (code, name, secret)
      values (v_code, v_name, v_plain)
      returning * into g;
      return g;
    exception when unique_violation then
      -- Name collision → surface it; code collision → loop and retry.
      if exists (select 1 from public.groups where lower(name) = lower(v_name)) then
        raise exception 'name taken' using errcode = '23505';
      end if;
    end;
  end loop;
end
$$;

-- Set/change/clear the login password. No uniqueness concern anymore since the
-- secret isn't part of the identity. Empty clears it (open group).
create or replace function public.group_set_secret(p_group_id uuid, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_secret text := trim(coalesce(p_secret, ''));
begin
  update public.groups
  set secret = case when v_secret = '' then null else v_secret end
  where id = p_group_id
  returning * into g;
  return g;
end
$$;

-- Completely delete a group and every game played under it.
create or replace function public.group_delete(p_group_id uuid)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  delete from public.games where group_id = p_group_id;
  delete from public.groups where id = p_group_id;
end
$$;

-- group_delete runs as the caller (security invoker); anon needs a delete policy
-- on groups (games already has one). Consistent with the app's open model.
drop policy if exists "anon delete" on public.groups;
create policy "anon delete" on public.groups for delete
  to anon, authenticated using (true);
