-- Spielzettel: lightweight "groups" so a fixed circle of friends can play
-- many games over time and see a shared history + stats. No real accounts:
-- a player is just a name + a locally-generated id (see app/lib/account.ts).
-- A group is joined by code, exactly like a game.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{5}$'),
  name text not null default '',
  -- [{ id, name }] — id is the member's local account id.
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "anon read" on public.groups
  for select to anon, authenticated using (true);
create policy "anon insert" on public.groups
  for insert to anon, authenticated with check (true);
create policy "anon update" on public.groups
  for update to anon, authenticated using (true) with check (true);

-- Games can belong to a group; a deleted group leaves its games ungrouped.
alter table public.games
  add column group_id uuid references public.groups(id) on delete set null;
create index games_group_id_idx on public.games (group_id);

-- Atomic join: append the member unless their id is already present, so
-- several friends joining at once never clobber the array.
create function public.group_add_member(p_code text, p_member jsonb)
returns public.groups
language plpgsql
security invoker set search_path = ''
as $$
declare
  g public.groups;
begin
  update public.groups
  set members = case
    when members @> jsonb_build_array(jsonb_build_object('id', p_member->>'id'))
      then members
    else members || jsonb_build_array(p_member)
  end
  where code = p_code
  returning * into g;
  return g;
end
$$;
