-- 0010 — The Student plan's saved-tools limit, enforced in the database.
--
-- The pricing page promised "Save up to 10 favorite tools" on Student and
-- "Unlimited favorite tools" on Pro, and nothing enforced either: every paid
-- plan unlocked the same app. The app now stops an 11th save on Student; this
-- is the same rule where it cannot be skipped by calling the API directly.
--
-- WHO IS LIMITED
-- Only an account whose current, unexpired, non-trial plan is Student
-- ('shishya'). Pro, Founder, trials, lapsed plans and accounts with no plan
-- are not limited here. A lapsed account is sent to the paywall by the app, so
-- a cap here would add nothing but a second way to fail.
--
-- Stack tools are never counted. Only kind = 'saved'.
--
-- KEEP IN STEP WITH src/utils/planData.js (shishya.limits.saved). The test
-- test/saved-limit.test.mjs reads both and fails if they disagree.

create or replace function public.saved_limit_for(p_user uuid)
  returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case e.plan_code when 'shishya' then 10 end
    from public.user_entitlements e
   where e.user_id = p_user
     and e.status = 'active'
     and coalesce(e.source, '') <> 'trial'
     and (e.ends_at is null or e.ends_at > now())
   order by e.created_at desc
   limit 1;
$$;

revoke all on function public.saved_limit_for(uuid) from public;
revoke all on function public.saved_limit_for(uuid) from anon, authenticated;

create or replace function public.enforce_saved_limit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.kind <> 'saved' then
    return new;
  end if;

  v_limit := public.saved_limit_for(new.user_id);
  if v_limit is null then
    return new;
  end if;

  -- A row-level BEFORE trigger sees rows inserted earlier in the same
  -- statement, so a single bulk insert of eleven is refused too.
  select count(*) into v_count
    from public.tool_refs
   where user_id = new.user_id and kind = 'saved';

  if v_count >= v_limit then
    -- The limit is in the message so the client can keep the first N on the
    -- server rather than failing the whole sync (see src/state/sync.js).
    raise exception 'saved_limit_reached:%', v_limit
      using errcode = 'P0001', hint = 'Upgrade to Pro for unlimited saved tools';
  end if;

  return new;
end
$$;

drop trigger if exists tool_refs_saved_limit on public.tool_refs;
create trigger tool_refs_saved_limit
  before insert on public.tool_refs
  for each row execute function public.enforce_saved_limit();

do $$
begin
  if to_regprocedure('public.saved_limit_for(uuid)') is null then
    raise exception '0010 failed: saved_limit_for missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tool_refs_saved_limit') then
    raise exception '0010 failed: tool_refs_saved_limit trigger missing';
  end if;
end $$;
