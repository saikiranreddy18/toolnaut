-- 0008 — Account deletion.
--
-- Lets a person permanently delete their account from Settings, confirmed by a
-- one-time code emailed to the account's address (api/account-delete.js).
--
-- WHAT GOES, WHAT STAYS
-- Everything about the PERSON is erased: profile and quiz answers, stack and
-- shortlist, roadmap progress, their place in the explorer count, alert
-- subscription, entitlements, and finally the sign-in record itself.
--
-- Payment RECORDS stay, stripped of identity. Indian GST rules require keeping
-- transaction records for years, and a refund or chargeback raised after the
-- account is gone still has to reconcile against Razorpay. So a payment row
-- keeps its amount, plan, status, dates and Razorpay ids, and loses the link to
-- the account. The stored Razorpay webhook payloads for those payments lose
-- the payer's email, phone, UPI id and card details the same way.
--
-- That needs payment_transactions.user_id to be allowed to go null, and its
-- foreign key to stop cascading: with ON DELETE CASCADE, deleting the sign-in
-- record would silently delete the very records this is meant to keep.
--
-- Forward-only and idempotent, like 0005. Production is a hybrid of 0004 and
-- the old bootstrap payments.sql, whose foreign keys carry different names and
-- different delete rules, so they are found by what they ARE, not by name.

-- ── one-time codes ───────────────────────────────────────────────────────────
-- One pending code per account. Only an HMAC of the code is stored, never the
-- code (see api/_accountDeletion.js). RLS on with NO policies: only the service
-- role can read or write this table, never a browser.
create table if not exists public.account_deletion_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0 check (attempts >= 0),
  sent_at    timestamptz not null default now()
);

alter table public.account_deletion_codes enable row level security;

-- ── payment records outlive the account ──────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.contype = 'f'
      and nsp.nspname = 'public'
      and rel.relname in ('payment_transactions', 'user_entitlements')
      and att.attname = 'user_id'
      and con.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;

alter table public.payment_transactions alter column user_id drop not null;

-- set null: the payment survives its payer.
alter table public.payment_transactions
  add constraint payment_transactions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- cascade: access to the product is personal and goes with the person. The
-- bootstrap schema had no delete rule here at all, which would have made the
-- sign-in record undeletable for anyone who had ever paid.
alter table public.user_entitlements
  add constraint user_entitlements_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- ── the erase itself ─────────────────────────────────────────────────────────
-- One function, one transaction: either every personal row is gone and every
-- payment anonymised, or nothing changed. api/account-delete.js calls this with
-- the service role, then deletes the sign-in record through the Auth admin API.
-- Safe to run twice for the same person, which is what makes a failed second
-- step retryable.
create or replace function public.delete_account_data(p_user_id uuid, p_email text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_orders   text[];
  v_payments integer := 0;
  v_events   integer := 0;
  v_alerts   integer := 0;
begin
  if p_user_id is null then
    raise exception 'delete_account_data: a user id is required';
  end if;

  select coalesce(array_agg(razorpay_order_id), '{}')
    into v_orders
    from public.payment_transactions
   where user_id = p_user_id;

  -- Razorpay's payment entity carries the payer's email, phone, UPI handle and
  -- card details. Keep the event (id, amount, status, order) for reconciliation;
  -- drop what identifies the person.
  update public.webhook_events
     set payload = payload
       #- '{payload,payment,entity,email}'
       #- '{payload,payment,entity,contact}'
       #- '{payload,payment,entity,vpa}'
       #- '{payload,payment,entity,card}'
       #- '{payload,payment,entity,notes,user_id}'
       #- '{payload,order,entity,notes,user_id}'
   where payload #>> '{payload,payment,entity,notes,user_id}' = p_user_id::text
      or payload #>> '{payload,order,entity,notes,user_id}' = p_user_id::text
      or payload #>> '{payload,payment,entity,order_id}' = any (v_orders);
  get diagnostics v_events = row_count;

  update public.payment_transactions
     set user_id = null,
         metadata = metadata - 'email' - 'contact' - 'name' - 'user_id',
         updated_at = now()
   where user_id = p_user_id;
  get diagnostics v_payments = row_count;

  delete from public.user_entitlements      where user_id = p_user_id;
  delete from public.tool_refs              where user_id = p_user_id;
  delete from public.roadmap_progress       where user_id = p_user_id;
  delete from public.profiles               where id = p_user_id;
  delete from public.explorers              where id = p_user_id;
  delete from public.account_deletion_codes where user_id = p_user_id;

  if p_email is not null and length(trim(p_email)) > 0 then
    delete from public.alert_subscribers where lower(email) = lower(trim(p_email));
    get diagnostics v_alerts = row_count;
  end if;

  return jsonb_build_object(
    'payments_anonymised', v_payments,
    'webhook_events_scrubbed', v_events,
    'alert_subscriptions_removed', v_alerts
  );
end
$$;

-- Nobody but the server may run this. Erasing an account is never something a
-- browser holding an anon or user token gets to invoke directly.
revoke all on function public.delete_account_data(uuid, text) from public;
revoke all on function public.delete_account_data(uuid, text) from anon, authenticated;
grant execute on function public.delete_account_data(uuid, text) to service_role;

-- ── assertions ───────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.account_deletion_codes') is null then
    raise exception '0008 failed: account_deletion_codes missing';
  end if;
  if to_regprocedure('public.delete_account_data(uuid,text)') is null then
    raise exception '0008 failed: delete_account_data missing';
  end if;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'payment_transactions'
       and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    raise exception '0008 failed: payment_transactions.user_id is still NOT NULL';
  end if;
end $$;
