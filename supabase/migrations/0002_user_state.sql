-- Durable per-account state: the server copy of what scopedStorage.js keeps in
-- localStorage today. Run once in Supabase → SQL Editor.
--
-- SCHEMA NOTE — why this is not the six-table design
-- A reviewer proposed profiles / stacks / stack_items / saved_tools / roadmaps /
-- roadmap_progress, which models MULTIPLE NAMED STACKS per user. Toolnaut has
-- no such feature: there is exactly one stack, held as an array of slugs. Adding
-- stacks.title and stack_items.priority now would be inventing a product
-- decision in the schema and then having to migrate it when the real one lands.
--
-- So this models what the app actually has, in three tables, with room to grow:
-- adding a stacks table later means adding a nullable stack_id to tool_refs, not
-- rewriting it.
--
-- SECURITY
-- Every table below is RLS-enabled with separate SELECT / INSERT / UPDATE /
-- DELETE policies keyed on auth.uid(). No table is readable without a session,
-- and no policy lets one account touch another's rows. Only the anon key is
-- ever used in the browser; nothing here needs the service-role key.

-- ── profile ────────────────────────────────────────────────────────────────
-- One row per account. quiz_answers is jsonb because it is a bag of nine
-- answers whose keys change when the intake changes — a column per question
-- would need a migration every time a question is reworded.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  quiz_answers        jsonb,
  quiz_completed      boolean not null default false,
  avatar_id           text,
  plan                text not null default 'shishya',
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (auth.uid() = id);

-- ── tool references (the stack, and the shortlist) ─────────────────────────
-- One table with a `kind` rather than two near-identical tables: both are
-- "this user pointed at this tool", they are always read together, and a single
-- table means one policy set and one sync path.
--
-- tool_slug references the CATALOGUE, which lives in the repo (toolsCatalog.js
-- + tools.json), not in Postgres. Storing the slug rather than the tool's name
-- or price means a catalogue update never rewrites user rows.
create table if not exists public.tool_refs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tool_slug  text not null,
  kind       text not null check (kind in ('stack', 'saved')),
  added_at   timestamptz not null default now(),
  primary key (user_id, tool_slug, kind)
);

-- The composite primary key is what makes import idempotent: re-running it
-- conflicts instead of duplicating, so a retry after a half-failed sync cannot
-- leave someone with the same tool in their stack twice.
create index if not exists tool_refs_user_kind_idx on public.tool_refs (user_id, kind);

alter table public.tool_refs enable row level security;

drop policy if exists tool_refs_select_own on public.tool_refs;
create policy tool_refs_select_own on public.tool_refs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists tool_refs_insert_own on public.tool_refs;
create policy tool_refs_insert_own on public.tool_refs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists tool_refs_update_own on public.tool_refs;
create policy tool_refs_update_own on public.tool_refs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tool_refs_delete_own on public.tool_refs;
create policy tool_refs_delete_own on public.tool_refs
  for delete to authenticated using (auth.uid() = user_id);

-- ── roadmap / lesson progress ──────────────────────────────────────────────
-- step_key is the app's existing "<milestoneId>:<stepIndex>" (and
-- "<milestoneId>:quiz") key, kept verbatim so the client does not have to
-- translate between two progress formats.
create table if not exists public.roadmap_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  step_key     text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_key)
);

alter table public.roadmap_progress enable row level security;

drop policy if exists roadmap_select_own on public.roadmap_progress;
create policy roadmap_select_own on public.roadmap_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists roadmap_insert_own on public.roadmap_progress;
create policy roadmap_insert_own on public.roadmap_progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists roadmap_update_own on public.roadmap_progress;
create policy roadmap_update_own on public.roadmap_progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists roadmap_delete_own on public.roadmap_progress;
create policy roadmap_delete_own on public.roadmap_progress
  for delete to authenticated using (auth.uid() = user_id);

-- ── verification ───────────────────────────────────────────────────────────
-- The client calls this to decide whether server sync is available at all.
-- Without it, every visitor would eat three failed round trips before falling
-- back to local storage on a project where the migration has not been run.
create or replace function public.sync_available()
  returns boolean
  language sql
  stable
as $$ select true $$;

grant execute on function public.sync_available() to anon, authenticated;
