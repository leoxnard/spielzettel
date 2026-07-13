-- Patches a single player inside the players array atomically, so
-- several people renaming themselves at the same time (each on their
-- own phone) never overwrite each other's edits.
-- Add/remove/reorder still write the whole array (rare, host actions).

create function public.merge_player(p_game_id uuid, p_player_id text, p_patch jsonb)
returns void
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
  where id = p_game_id;
$$;
