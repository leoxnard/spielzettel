-- One round-trip "join": find (or create) a group by name AND add the caller
-- as a member, returning the full group row. Collapses the previous
-- fetch-by-name → insert → add-member waterfall (3 calls) into one, which
-- matters most over slow mobile links.

create or replace function public.group_join(p_name text, p_member_name text)
returns public.groups
language plpgsql
security invoker set search_path = ''
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
  -- Existing group with this name (case-insensitive)?
  select * into g from public.groups where lower(name) = lower(v_name) limit 1;

  if not found then
    -- Create it, retrying on the (rare) code collision. A concurrent creator
    -- of the same name trips the name unique index → fall back to theirs.
    loop
      v_code := upper(array_to_string(array(
        select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                      floor(random() * 31 + 1)::int, 1)
        from generate_series(1, 5)
      ), ''));
      begin
        insert into public.groups (code, name, members)
        values (v_code, v_name, jsonb_build_array(v_member))
        returning * into g;
        return g;
      exception when unique_violation then
        select * into g from public.groups where lower(name) = lower(v_name) limit 1;
        if found then exit; end if; -- name taken by someone else → use theirs
        -- otherwise it was a code collision → loop and try a new code
      end;
    end loop;
  end if;

  -- Add the member unless their (lowercased) name is already present.
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

-- Let the group page react live to member changes (games are already published).
alter publication supabase_realtime add table public.groups;
