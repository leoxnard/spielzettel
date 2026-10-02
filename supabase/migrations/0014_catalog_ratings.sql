-- Community ratings for the card game catalog (/katalog). No accounts: each
-- device sends a random id it keeps in localStorage, one rating per device
-- and game. The table itself is closed (RLS, no policies); reads and writes
-- go through the two functions below.

create table if not exists public.catalog_ratings (
  slug text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  device_id uuid not null,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (slug, device_id)
);

alter table public.catalog_ratings enable row level security;

create or replace function public.catalog_rating_stats()
returns table (slug text, avg numeric, count integer)
language sql stable
security definer set search_path = ''
as $$
  select r.slug, round(avg(r.stars), 2), count(*)::integer
  from public.catalog_ratings r
  group by r.slug;
$$;

-- Upsert (or delete with p_stars null) and return the game's new stats.
create or replace function public.rate_catalog_game(
  p_slug text,
  p_device uuid,
  p_stars integer
)
returns table (slug text, avg numeric, count integer)
language plpgsql
security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_stars is null then
    delete from public.catalog_ratings r
    where r.slug = p_slug and r.device_id = p_device;
  else
    insert into public.catalog_ratings as r (slug, device_id, stars)
    values (p_slug, p_device, p_stars)
    on conflict (slug, device_id)
    do update set stars = excluded.stars, updated_at = now();
  end if;

  return query
    select p_slug, coalesce(round(avg(r.stars), 2), 0), count(*)::integer
    from public.catalog_ratings r
    where r.slug = p_slug;
end
$$;

grant execute on function public.catalog_rating_stats() to anon, authenticated;
grant execute on function public.rate_catalog_game(text, uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';
