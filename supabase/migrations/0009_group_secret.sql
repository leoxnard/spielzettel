-- Redesign: a group is entered by its **name alone** (no personal username
-- anymore), plus an **optional secret word** to keep unrelated groups that
-- happen to share a name apart. Everyone is equal — there is no owner; anyone
-- may add, rename, remove or merge members.

-- No more owner: the roster is managed by all.
alter table public.groups drop column if exists owner_id;

-- Optional secret. null = no secret (the open bucket). A group is uniquely
-- identified by (lower(name), secret) — same name + different secret are
-- different groups, so guessers/collisions can't stumble into a protected one.
-- We store a hash, never the word itself, so `select`ing a group can't leak it.
alter table public.groups add column if not exists secret_hash text;

-- Replace the name-only key with (name, secret). Existing groups have no
-- secret_hash, so they all sit in the '' bucket and stay unique by name.
drop index if exists groups_name_unique;
create unique index groups_name_secret_unique
  on public.groups (lower(name), coalesce(secret_hash, ''));

-- Enter a group by name (+ optional secret). Find-or-create by (name, secret)
-- and return the row. No member is added — identity is the group itself, and
-- the roster is filled in explicitly (group page / lobby picker).
--
-- 0007's version took (p_name, p_member_name) — same argument types, different
-- second parameter name — and `create or replace` refuses to rename a
-- parameter, so the old signature has to go first or a replay from scratch
-- stops here.
drop function if exists public.group_join(text, text);

create or replace function public.group_join(p_name text, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_name text := trim(p_name);
  v_secret text := trim(coalesce(p_secret, ''));
  v_hash text := case when v_secret = '' then null else md5(lower(v_secret)) end;
  v_code text;
begin
  select * into g from public.groups
  where lower(name) = lower(v_name)
    and coalesce(secret_hash, '') = coalesce(v_hash, '')
  limit 1;
  if found then return g; end if;

  -- Create it, retrying on the (rare) code collision. A concurrent creator of
  -- the same name+secret trips the composite unique index → fall back to theirs.
  loop
    v_code := upper(array_to_string(array(
      select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                    floor(random() * 31 + 1)::int, 1)
      from generate_series(1, 5)
    ), ''));
    begin
      insert into public.groups (code, name, secret_hash)
      values (v_code, v_name, v_hash)
      returning * into g;
      return g;
    exception when unique_violation then
      select * into g from public.groups
      where lower(name) = lower(v_name)
        and coalesce(secret_hash, '') = coalesce(v_hash, '')
      limit 1;
      if found then exit; end if; -- name+secret taken → use theirs
      -- otherwise it was a code collision → loop and try a new code
    end;
  end loop;
  return g;
end
$$;

-- Remove a member. No owner anymore, so anyone in the group can be removed.
create or replace function public.group_member_remove(p_group_id uuid, p_member_id text)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare g public.groups;
begin
  update public.groups
  set members = (
    select coalesce(jsonb_agg(m), '[]'::jsonb)
    from jsonb_array_elements(members) m
    where m->>'id' <> p_member_id
  )
  where id = p_group_id
  returning * into g;
  return g;
end
$$;

-- Rename a member (id follows the lowercased name). A pre-existing member with
-- the new id is collapsed away to avoid duplicates. No owner to carry along.
create or replace function public.group_member_rename(
  p_group_id uuid, p_old_id text, p_new_name text
)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_new_id text := lower(trim(p_new_name));
  v_name text := trim(p_new_name);
begin
  update public.groups
  set members = (
    select coalesce(jsonb_agg(
      case when m->>'id' = p_old_id
        then jsonb_build_object('id', v_new_id, 'name', v_name)
        else m end
    ), '[]'::jsonb)
    from jsonb_array_elements(members) m
    where m->>'id' = p_old_id or m->>'id' <> v_new_id
  )
  where id = p_group_id
  returning * into g;
  return g;
end
$$;
