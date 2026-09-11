-- Real explorer count.
--
-- The landing page showed "1,300 EXPLORERS", a number typed into
-- communityStats.js because there was nothing to count. Supabase is wired to
-- authentication only, and auth.users is not readable from the browser (that
-- needs the service-role key, which must never ship in a client bundle). So
-- counting real sign-ups needs a table of our own.
--
-- Run this once in Supabase → SQL Editor. Until it exists the app degrades
-- honestly: the tile disappears rather than showing an invented figure.

-- One row per signed-up explorer. Deliberately holds NO personal data — not a
-- name, not an email, just the auth id and when they joined. A public counter
-- should not be a reason to store anything about anyone.
create table if not exists public.explorers (
  id        uuid primary key references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now()
);

alter table public.explorers enable row level security;

-- A signed-in explorer may register THEMSELVES and nothing else. The check on
-- auth.uid() = id is what stops one account inflating the count by inserting
-- rows for ids it invented.
drop policy if exists explorers_insert_self on public.explorers;
create policy explorers_insert_self
  on public.explorers for insert
  to authenticated
  with check (auth.uid() = id);

-- Note there is deliberately NO select policy. Nobody can read the rows —
-- not even their own. The only thing that escapes this table is the aggregate
-- below, so the count is public while membership stays private.
create or replace function public.explorer_count()
  returns bigint
  language sql
  security definer      -- runs as owner, so it can count past RLS
  set search_path = public
  stable
as $$
  select count(*) from public.explorers;
$$;

grant execute on function public.explorer_count() to anon, authenticated;

-- Backfill anyone who signed up before this table existed, so switching the
-- landing page over to the real number does not reset it to zero.
insert into public.explorers (id, joined_at)
select id, created_at from auth.users
on conflict (id) do nothing;
