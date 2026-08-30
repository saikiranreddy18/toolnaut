-- Source-backed tool claims: provenance and freshness for volatile facts.
--
-- THE PROBLEM THIS SOLVES
-- The catalogue presents pricing, status and capability as current fact with
-- no source and no date. One stale price costs trust across all 781 tools —
-- and trust in recommendations is the product. This table makes every volatile
-- claim carry WHERE it came from, WHEN it was checked, and WHEN to re-check.
--
-- WHY tool_slug AND NOT A tools TABLE
-- The canonical catalogue lives in the repo (toolsCatalog.js + tools.json),
-- maintained by the radar pipeline and its 102 tests. Duplicating it into
-- Postgres now would create two sources of truth that drift. Claims reference
-- the catalogue slug — the same choice tool_refs made — and a tools table can
-- be introduced later without rewriting this one.
--
-- ACCESS MODEL
-- Claims are EDITORIAL data, not user data. Everyone may read them (the
-- freshness UI needs them without a session); nobody writes them from the
-- browser. There are deliberately NO insert/update/delete policies — writes
-- happen only through the service role (radar pipeline, admin scripts), which
-- bypasses RLS by design and never ships to a client.

create table if not exists public.tool_claims (
  id           uuid primary key default gen_random_uuid(),
  tool_slug    text not null,
  -- Identity of the specific fact WITHIN its type: the integration name
  -- ('slack'), the plan name ('pro'), or '' for singleton types like status.
  -- This is what makes the dedup index below precise — uniqueness on
  -- (slug, type, source_url) alone would block two integrations documented on
  -- the same page, and uniqueness on (slug, type) would allow only one
  -- pricing plan per tool. (slug, type, key) says exactly what a duplicate is.
  -- Normalised at the database, not just the admin UI: without the CHECK,
  -- 'Slack' and 'slack' become two separate "current" facts and the dedup
  -- index cannot see it. Human-facing capitalisation goes in claim_display.
  claim_key    text not null default ''
    constraint tool_claims_key_format check (claim_key ~ '^[a-z0-9._-]*$'),
  claim_display text,
  claim_type   text not null check (claim_type in (
    'pricing', 'free_tier', 'integration', 'api', 'webhook', 'self_hosting',
    'privacy', 'security', 'compliance', 'feature', 'availability', 'status'
  )),
  value_json   jsonb not null,
  source_url   text not null,
  source_title text,
  source_type  text not null check (source_type in (
    'official_pricing', 'official_docs', 'privacy_policy', 'security_page',
    'changelog', 'official_announcement', 'editorial_review'
  )),
  verified_at   timestamptz not null default now(),
  verified_by   text,
  review_due_at timestamptz,
  confidence    text not null default 'high' check (confidence in ('high', 'medium', 'low')),
  status        text not null default 'current' check (status in ('current', 'stale', 'disputed', 'removed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tool_claims_slug_idx on public.tool_claims (tool_slug);
create index if not exists tool_claims_review_idx on public.tool_claims (review_due_at)
  where status = 'current';

-- One CURRENT claim per fact. A re-verification supersedes by flipping the old
-- row to 'stale' first (or updating in place); an accidental double-insert of
-- the same fact conflicts instead of creating two "current" truths that could
-- disagree. Historical rows (stale/disputed/removed) are unconstrained — they
-- are the audit trail.
create unique index if not exists tool_claims_current_identity_idx
  on public.tool_claims (tool_slug, claim_type, claim_key)
  where status = 'current';

alter table public.tool_claims enable row level security;

-- Read-only to the world; the freshness UI must work for signed-out visitors.
drop policy if exists tool_claims_public_read on public.tool_claims;
create policy tool_claims_public_read
  on public.tool_claims for select
  to anon, authenticated
  using (status <> 'removed');

-- What needs re-checking, oldest first. The verification workflow's worklist:
--   select * from public.claims_due_for_review limit 20;
create or replace view public.claims_due_for_review as
  select tool_slug, claim_type, source_url, verified_at, review_due_at
  from public.tool_claims
  where status = 'current'
    and review_due_at is not null
    and review_due_at <= now()
  order by review_due_at asc;
