-- Show the secret word back to the group. Until now only a one-way md5 hash
-- was stored, so the word could never be displayed. We now also keep the
-- plaintext so the group page can show + edit it. Trade-off accepted: the app
-- has no login and anon can read group rows, so the word is not a real secret
-- — it just keeps unrelated same-named groups apart. The hash stays as the
-- matching/uniqueness key.
alter table public.groups add column if not exists secret text;

-- Store both plaintext and hash when the secret changes.
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
  set secret_hash = v_hash,
      secret = case when v_secret = '' then null else v_secret end
  where id = p_group_id
  returning * into g;
  return g;
end
$$;

-- Creating a group by name (+ optional secret) now also records the plaintext.
create or replace function public.group_join(p_name text, p_secret text default null)
returns public.groups
language plpgsql security invoker set search_path = ''
as $$
declare
  g public.groups;
  v_name text := trim(p_name);
  v_secret text := trim(coalesce(p_secret, ''));
  v_hash text := case when v_secret = '' then null else md5(lower(v_secret)) end;
  v_plain text := case when v_secret = '' then null else v_secret end;
  v_code text;
begin
  select * into g from public.groups
  where lower(name) = lower(v_name)
    and coalesce(secret_hash, '') = coalesce(v_hash, '')
  limit 1;
  if found then return g; end if;

  loop
    v_code := upper(array_to_string(array(
      select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                    floor(random() * 31 + 1)::int, 1)
      from generate_series(1, 5)
    ), ''));
    begin
      insert into public.groups (code, name, secret_hash, secret)
      values (v_code, v_name, v_hash, v_plain)
      returning * into g;
      return g;
    exception when unique_violation then
      select * into g from public.groups
      where lower(name) = lower(v_name)
        and coalesce(secret_hash, '') = coalesce(v_hash, '')
      limit 1;
      if found then exit; end if;
    end;
  end loop;
  return g;
end
$$;
