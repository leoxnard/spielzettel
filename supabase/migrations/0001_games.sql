-- Spielzettel: single-table data model.
-- Every score sheet is one row; `state` holds game-specific data,
-- `players` the ordered player list. Applied to the Supabase project
-- as migration `games_table`.

create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{5}$'),
  game_type text not null,
  title text,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  players jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

-- No accounts: whoever knows a game code may read and write it.
alter table public.games enable row level security;

create policy "anon read" on public.games
  for select to anon, authenticated using (true);
create policy "anon insert" on public.games
  for insert to anon, authenticated with check (true);
create policy "anon update" on public.games
  for update to anon, authenticated using (true) with check (true);

-- Field-level merge for concurrent score entry: jsonb_set inside a single
-- UPDATE is atomic per row, so two clients writing different cells at the
-- same moment both survive. NULL value deletes the path (clear cell).
create function public.set_state_at(p_game_id uuid, p_path text[], p_value jsonb)
returns void
language sql
security invoker set search_path = ''
as $$
  update public.games
  set state = case
    when p_value is null then state #- p_path
    else jsonb_set(state, p_path, p_value, true)
  end
  where id = p_game_id;
$$;

alter publication supabase_realtime add table public.games;
