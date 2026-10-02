-- Smoother sync: every score write now returns the updated row, so the
-- writing client can confirm its optimistic value from the response instead
-- of waiting for (and racing) the realtime echo. Semantics are unchanged.
--
-- Changing a function's return type needs drop + create; `create or replace`
-- refuses it.

-- updated_at must be strictly increasing per row: clients drop payloads older
-- than what they show. now() is the transaction *start*, so a transaction that
-- waited on the row lock could stamp an older time than the one it overwrote.
create or replace function public.touch_updated_at() returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end
$$;

drop function if exists public.set_state_at(uuid, text[], jsonb);
create function public.set_state_at(p_game_id uuid, p_path text[], p_value jsonb)
returns public.games
language sql
security invoker set search_path = ''
as $$
  update public.games
  set state = case
    when p_value is null then state #- p_path
    else jsonb_set(state, p_path, p_value, true)
  end
  where id = p_game_id
  returning *;
$$;

drop function if exists public.merge_state_at(uuid, text[], jsonb);
create function public.merge_state_at(p_game_id uuid, p_path text[], p_value jsonb)
returns public.games
language sql
security invoker set search_path = ''
as $$
  update public.games
  set state = jsonb_set(
    state,
    p_path,
    coalesce(state #> p_path, '{}'::jsonb) || p_value,
    true
  )
  where id = p_game_id
  returning *;
$$;

drop function if exists public.merge_player(uuid, text, jsonb);
create function public.merge_player(p_game_id uuid, p_player_id text, p_patch jsonb)
returns public.games
language sql
security invoker set search_path = ''
as $$
  update public.games
  set players = coalesce(
    (
      select jsonb_agg(
        case when elem->>'id' = p_player_id then elem || p_patch else elem end
      )
      from jsonb_array_elements(players) as elem
    ),
    players
  )
  where id = p_game_id
  returning *;
$$;

notify pgrst, 'reload schema';
