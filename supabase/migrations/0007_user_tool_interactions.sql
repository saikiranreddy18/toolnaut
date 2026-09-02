-- 0007 — what people actually DO with the tools we recommend.
--
-- THE GAP THIS FILLS
-- Toolnaut asks nine questions once and answers forever. It already knows what
-- a person SAID they wanted; it has never known what they DID with the answer.
-- Saves, dismissals and comparisons are sent to analytics for a human to read
-- in a dashboard, and nothing about them reaches the ranking. So a tool that
-- every single user dismisses keeps being recommended.
--
-- This is the append-only event log that makes the difference measurable. It is
-- deliberately NOT a scoring table: ranking off behaviour needs a volume of
-- users this product does not have yet. Collect first, score later — the data
-- only accrues if the collecting starts before the scoring is needed.
--
-- WHY NOT JUST WIDEN AN EXISTING TABLE
-- tool_refs answers "what is in your stack right now" — current state, one row
-- per tool, rewritten as it changes. This answers "what happened, and when" —
-- history, many rows per tool, never rewritten. Those are different shapes, and
-- collapsing them would destroy the history the moment a user unsaves a tool.

create table if not exists public.user_tool_interactions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  tool_slug  text not null,

  -- A closed vocabulary, not free text. An open column becomes six spellings of
  -- the same event within a month, and then nothing can be counted.
  action     text not null check (action in (
    'opened',        -- viewed the tool's detail page
    'saved',         -- added to the shortlist
    'unsaved',       -- removed from the shortlist
    'stack_added',   -- promoted into their actual stack
    'stack_removed', -- taken out of their stack
    'compared',      -- put side by side with another tool
    'dismissed'      -- explicitly rejected from a recommendation
  )),

  -- WHERE it happened. The same action means different things in different
  -- places: saving from a personalised kit is a much stronger signal than
  -- saving while browsing the whole catalogue, and only this column can tell
  -- those apart later.
  context    text,

  -- Room for signal we have not thought of yet (position in a list, the
  -- persona at the time) without a migration per idea. Not indexed: nothing
  -- queries it yet, and an unused GIN index is pure write cost.
  metadata   jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- "Everything this user did, newest first" — the per-user read, and the one
-- the RLS policy filters by. Leading column matches the policy predicate.
create index if not exists user_tool_interactions_user_idx
  on public.user_tool_interactions (user_id, created_at desc);

-- "How does the world treat this tool" — the aggregate that will eventually
-- feed ranking: saves versus dismissals per slug.
create index if not exists user_tool_interactions_tool_idx
  on public.user_tool_interactions (tool_slug, action);

alter table public.user_tool_interactions enable row level security;

-- Own rows only, and no UPDATE policy anywhere: this is an append-only log.
-- Being able to rewrite history would make the log useless as evidence of what
-- actually happened.
drop policy if exists user_tool_interactions_select_own on public.user_tool_interactions;
create policy user_tool_interactions_select_own on public.user_tool_interactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_tool_interactions_insert_own on public.user_tool_interactions;
create policy user_tool_interactions_insert_own on public.user_tool_interactions
  for insert to authenticated with check (auth.uid() = user_id);

-- Delete stays open on purpose. This is a record of one person's behaviour, and
-- they should be able to erase it without filing a support request.
drop policy if exists user_tool_interactions_delete_own on public.user_tool_interactions;
create policy user_tool_interactions_delete_own on public.user_tool_interactions
  for delete to authenticated using (auth.uid() = user_id);
