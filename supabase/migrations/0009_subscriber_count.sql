-- 0009 — A real subscriber count for the landing page.
--
-- The community row showed "84 subscribers" and "6.5% conversion". Both were
-- typed into src/utils/communityStats.js as placeholders and labelled "preview
-- figures". This replaces the subscriber half with a count read from the
-- database, the same way 0001 replaced the invented explorer count.
--
-- WHAT COUNTS AS A SUBSCRIBER
-- One person with a PAID plan that is active right now: an active entitlement
-- that is not a trial, and that has not expired (a null end date is a lifetime
-- Founder plan, which never expires). Counted per person, not per payment, so
-- someone who renewed twice is still one subscriber.
--
-- Trials are deliberately excluded. Counting a free 7-day trial as a subscriber
-- is how a dashboard reports growth nobody has paid for.
--
-- WHY A FUNCTION
-- user_entitlements is private: row-level security lets a person read only
-- their own rows. A security-definer function can count past that and return
-- one number, so the landing page learns HOW MANY without anyone being able to
-- read WHO. Same pattern, and same grant, as public.explorer_count().

create or replace function public.subscriber_count()
  returns bigint
  language sql
  security definer
  set search_path = public
  stable
as $$
  select count(distinct user_id)
    from public.user_entitlements
   where status = 'active'
     and source <> 'trial'
     and user_id is not null
     and (ends_at is null or ends_at > now());
$$;

grant execute on function public.subscriber_count() to anon, authenticated;

do $$
begin
  if to_regprocedure('public.subscriber_count()') is null then
    raise exception '0009 failed: subscriber_count missing';
  end if;
end $$;
