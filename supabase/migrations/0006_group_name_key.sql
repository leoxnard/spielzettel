-- The group name became the identity: you type a group name and you're in
-- that group (no personal username anymore). Make the name the join key —
-- case-insensitive unique, so the same name always resolves to one group.
create unique index groups_name_unique on public.groups (lower(name));
