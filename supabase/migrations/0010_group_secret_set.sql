-- Let a group turn its secret word on/off or change it after creation. Same
-- hashing rule as group_join: empty secret clears it (open bucket), anything
-- else becomes its md5 hash. Since (name, secret) is the composite identity,
-- changing it moves the group to a new (name, secret) slot and fails with a
-- unique violation if that slot is already taken by another group.
create or replace function public.group_set_secret(p_group_id uuid, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_secret text := trim(coalesce(p_secret, ''));
  v_hash text := case when v_secret = '' then null else md5(lower(v_secret)) end;
begin
  update public.groups
  set secret_hash = v_hash
  where id = p_group_id
  returning * into g;
  return g;
end
$$;
