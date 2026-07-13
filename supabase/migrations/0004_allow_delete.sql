-- Deleting a game is host-initiated from the recent-games list on the
-- home page. Anyone who knows the game exists (same trust model as the
-- other anon policies) may delete it.
create policy "anon delete" on public.games
  for delete to anon, authenticated using (true);
