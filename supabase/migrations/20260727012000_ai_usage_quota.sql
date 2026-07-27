-- Per-user and project-wide daily quotas for AI (LLM) calls.
--
-- The parse-receipt edge function calls OpenAI on behalf of the signed-in user.
-- Before this migration nothing limited how often that could happen, so any
-- authenticated user could loop the function and run up the project owner's
-- OpenAI bill. This adds a counter the function must consume before it is
-- allowed to spend money.

-- -----------------------------------------------------------------------------
-- 1. Tunable limits
-- -----------------------------------------------------------------------------
-- Kept in a table rather than hardcoded in the function so the ceiling can be
-- raised from the Supabase SQL editor with a single UPDATE, no migration and no
-- edge function redeploy:
--
--   update public.app_config set value = 100 where key = 'ai_daily_limit';
create table if not exists public.app_config (
  key        text primary key,
  value      int  not null,
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: unreachable from PostgREST. Only the SECURITY
-- DEFINER function below reads it, and nothing but a privileged session writes.
alter table public.app_config enable row level security;

insert into public.app_config (key, value) values
  -- Comfortable for a heavy user: a long group trip is maybe 20 receipts a day.
  ('ai_daily_limit', 50),
  -- Circuit breaker across the whole project. Per-user limits alone don't help
  -- if someone scripts account creation, which is cheap while signup is open
  -- and email confirmation is off. At current pricing this ceiling caps spend
  -- at roughly 0.20 USD/day.
  ('ai_global_daily_limit', 500)
on conflict (key) do nothing;

comment on table public.app_config is
  'Server-side tunables read by SECURITY DEFINER functions. Not client-readable.';

-- -----------------------------------------------------------------------------
-- 2. Counter table
-- -----------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  call_count int  not null default 0,
  primary key (user_id, usage_date)
);

-- Supports the project-wide sum below; the primary key is user-first so it
-- can't serve a date-only lookup.
create index if not exists ai_usage_usage_date_idx on public.ai_usage (usage_date);

alter table public.ai_usage enable row level security;

comment on table public.ai_usage is
  'Daily per-user AI call counter. Written only by public.consume_ai_quota().';

-- -----------------------------------------------------------------------------
-- 3. Quota RPC
-- -----------------------------------------------------------------------------
create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid          uuid := auth.uid();
  _count        int;
  _global       bigint;
  _user_limit   int;
  _global_limit int;
begin
  if _uid is null then
    return false;
  end if;

  -- coalesce so a missing or deleted config row falls back to a safe ceiling
  -- rather than failing open into unlimited spend.
  select coalesce(max(value) filter (where key = 'ai_daily_limit'), 50),
         coalesce(max(value) filter (where key = 'ai_global_daily_limit'), 500)
    into _user_limit, _global_limit
    from public.app_config;

  -- Single atomic upsert so concurrent calls can't both read an under-limit
  -- count and then both proceed.
  insert into public.ai_usage (user_id, usage_date, call_count)
  values (_uid, current_date, 1)
  on conflict (user_id, usage_date)
    do update set call_count = ai_usage.call_count + 1
  returning call_count into _count;

  select coalesce(sum(call_count), 0)
    into _global
    from public.ai_usage
   where usage_date = current_date;

  -- Rejected calls still increment. Probing where the ceiling is shouldn't be
  -- free, otherwise the limit is trivial to sit just underneath.
  return _count <= _user_limit and _global <= _global_limit;
end;
$$;

revoke all on function public.consume_ai_quota() from public;
grant execute on function public.consume_ai_quota() to authenticated;
