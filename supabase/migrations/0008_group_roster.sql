-- Group roster management. The group's creator (first member) becomes its
-- "owner" and is the only one who may remove or rename members; anyone can
-- add. There's no auth, so the owner check is by name — a UX guardrail, not
-- security (consistent with the rest of the app's trust model).

alter table public.groups add column if not exists owner_id text;

-- Existing groups: the first member is the owner.
update public.groups
set owner_id = members->0->>'id'
where owner_id is null and jsonb_array_length(members) > 0;

-- group_join now records the creator as owner on first creation.
create or replace function public.group_join(p_name text, p_member_name text)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_name text := trim(p_name);
  v_member jsonb := jsonb_build_object(
    'id', lower(trim(p_member_name)),
    'name', trim(p_member_name)
  );
  v_code text;
begin
  select * into g from public.groups where lower(name) = lower(v_name) limit 1;

  if not found then
    loop
      v_code := upper(array_to_string(array(
        select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                      floor(random() * 31 + 1)::int, 1)
        from generate_series(1, 5)
      ), ''));
      begin
        insert into public.groups (code, name, members, owner_id)
        values (v_code, v_name, jsonb_build_array(v_member), v_member->>'id')
        returning * into g;
        return g;
      exception when unique_violation then
        select * into g from public.groups where lower(name) = lower(v_name) limit 1;
        if found then exit; end if;
      end;
    end loop;
  end if;

  update public.groups
  set members = case
    when members @> jsonb_build_array(jsonb_build_object('id', v_member->>'id'))
      then members
    else members || jsonb_build_array(v_member)
  end
  where id = g.id
  returning * into g;

  return g;
end
$$;

-- Add a member to an existing group by id (idempotent, deduped on lower(name)).
create or replace function public.group_member_add(p_group_id uuid, p_name text)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_member jsonb := jsonb_build_object(
    'id', lower(trim(p_name)),
    'name', trim(p_name)
  );
begin
  update public.groups
  set members = case
    when members @> jsonb_build_array(jsonb_build_object('id', v_member->>'id'))
      then members
    else members || jsonb_build_array(v_member)
  end
  where id = p_group_id
  returning * into g;
  return g;
end
$$;

-- Remove a member. The owner can never be removed (guards against orphaning
-- the group); other members are dropped from the array.
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
  where id = p_group_id and owner_id is distinct from p_member_id
  returning * into g;
  if not found then
    select * into g from public.groups where id = p_group_id;
  end if;
  return g;
end
$$;

-- Rename a member. Updates {id,name} (id follows the lowercased name); if the
-- renamed member was the owner, owner_id follows too. A pre-existing member
-- with the new id is collapsed away to avoid duplicates.
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
  ),
  owner_id = case when owner_id = p_old_id then v_new_id else owner_id end
  where id = p_group_id
  returning * into g;
  return g;
end
$$;
