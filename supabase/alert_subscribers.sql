-- Email-alert subscribers. Run once in Supabase → SQL Editor.
--
-- RLS is enabled with NO policies on purpose: the browser's anon key can
-- neither read nor write this table. Only the serverless functions touch it,
-- through the service-role key (set SUPABASE_SERVICE_ROLE_KEY in Vercel env),
-- which bypasses RLS. That keeps the subscriber list — a list of email
-- addresses — out of reach of anything running in a visitor's browser.

create table if not exists public.alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  -- quiz domain keys ('code','design',...); empty array = alert on everything
  domains text[] not null default '{}',
  -- per-subscriber secret for the one-click unsubscribe link
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- watermark for the daily cron: only tools discovered after this are sent
  last_notified_at timestamptz
);

alter table public.alert_subscribers enable row level security;

create index if not exists alert_subscribers_token_idx
  on public.alert_subscribers (unsubscribe_token);
