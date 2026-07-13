-- Shallow-merges an object into state at path (creating the leaf if
-- missing) inside a single UPDATE — concurrent merges by different
-- players into the same round object don't clobber each other.
-- Used by round-based games: merge_state_at(id, '{rounds,3}', '{"<playerId>": {...}}')

create function public.merge_state_at(p_game_id uuid, p_path text[], p_value jsonb)
returns void
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
  where id = p_game_id;
$$;
