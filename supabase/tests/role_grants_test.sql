-- The client roles' privilege surface, pinned exactly (Sprint #6,
-- 20261122210000_tighten_role_grants.sql).
--
-- RLS answers "which rows"; these grants answer "which operations at all". The
-- expected sets below are the whole surface the app is allowed: a new grant, a
-- lost grant or a default privilege that leaks onto a new table fails here, so
-- a change to the surface has to be made on purpose, in this file too.
--
-- Run against a local stack (supabase start): `npm run test:db`.

\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

begin;

create or replace function pg_temp.check_true(_label text, _cond boolean)
returns void language plpgsql as $$
begin
  if _cond then raise notice 'PASS  %', _label;
  else raise notice 'FAIL  %', _label;
  end if;
end;
$$;

-- Prints the difference when a set check fails, so the FAIL line says what
-- changed instead of only that something did.
create or replace function pg_temp.check_same(_label text, _actual text[], _expected text[])
returns void language plpgsql as $$
declare
  _extra text[] := array(select unnest(_actual) except select unnest(_expected) order by 1);
  _missing text[] := array(select unnest(_expected) except select unnest(_actual) order by 1);
begin
  if cardinality(_extra) = 0 and cardinality(_missing) = 0 then
    raise notice 'PASS  %', _label;
  else
    raise notice 'FAIL  %  (unexpected: %, missing: %)', _label, _extra, _missing;
  end if;
end;
$$;

\set QUIET off
\echo ''
\echo '--- table privileges ------------------------------------------------------'

select pg_temp.check_same(
  'anon has no privilege on any public table',
  array(select table_name || ':' || privilege_type
        from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public'),
  array[]::text[]);

select pg_temp.check_same(
  'authenticated has exactly the codified table privileges',
  array(select table_name || ':' || privilege_type
        from information_schema.role_table_grants
        where grantee = 'authenticated' and table_schema = 'public'),
  array[
    'profiles:SELECT', 'profiles:INSERT', 'profiles:UPDATE',
    'friend_requests:SELECT', 'friend_requests:UPDATE', 'friend_requests:DELETE',
    'groups:SELECT', 'groups:INSERT', 'groups:UPDATE',
    'group_members:SELECT', 'group_members:UPDATE',
    'expenses:SELECT',
    'expense_shares:SELECT',
    'expense_payers:SELECT',
    'settlements:SELECT', 'settlements:INSERT',
    'activity_log:SELECT',
    'activity_log_archive:SELECT'
  ]);

-- Column grants that are not implied by a table grant: only the soft deletes.
select pg_temp.check_same(
  'authenticated may UPDATE only deleted_at on expenses and settlements',
  array(select c.table_name || '.' || c.column_name
        from information_schema.column_privileges c
        where c.grantee = 'authenticated' and c.table_schema = 'public'
          and c.privilege_type = 'UPDATE'
          and c.table_name in ('expenses', 'settlements')),
  array['expenses.deleted_at', 'settlements.deleted_at']);

\echo ''
\echo '--- function privileges ---------------------------------------------------'

select pg_temp.check_same(
  'anon can execute no public function',
  array(select p.proname::text
        from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and has_function_privilege('anon', p.oid, 'execute')),
  array[]::text[]);

select pg_temp.check_same(
  'authenticated can execute exactly the RLS helpers and the RPCs',
  array(select p.proname::text
        from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and has_function_privilege('authenticated', p.oid, 'execute')),
  array[
    'is_group_member', 'is_group_participant',
    'join_group_by_invite', 'lookup_user_by_friend_code', 'send_friend_request_by_code',
    'consume_ai_quota', 'get_emoji_usage_stats',
    'create_expense_with_shares', 'update_expense_with_shares'
  ]);

\echo ''
\echo '--- future objects --------------------------------------------------------'

-- A table, sequence and function created the way a migration creates them
-- (as postgres) must start with no access for the client roles.
create table public.zz_grants_probe (id bigint generated always as identity primary key);
create function public.zz_grants_probe_fn() returns int language sql as 'select 1';

select pg_temp.check_true(
  'a new table grants nothing to anon or authenticated',
  not exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and table_name = 'zz_grants_probe'
                and grantee in ('anon', 'authenticated')));

select pg_temp.check_true(
  'a new sequence grants nothing to anon or authenticated',
  not has_sequence_privilege('anon', 'public.zz_grants_probe_id_seq', 'usage, select, update')
  and not has_sequence_privilege('authenticated', 'public.zz_grants_probe_id_seq', 'usage, select, update'));

-- Only direct grants: EXECUTE through PUBLIC is Postgres's global default, and
-- each migration revokes it for its own functions (the anon check above fails
-- if one does not).
select pg_temp.check_true(
  'a new function grants nothing to anon or authenticated directly',
  not exists (select 1
              from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
              where p.oid = 'public.zz_grants_probe_fn()'::regprocedure
                and a.grantee in ('anon'::regrole, 'authenticated'::regrole)));

select pg_temp.check_true(
  'service_role still gets full access to new tables (delete-account)',
  has_table_privilege('service_role', 'public.zz_grants_probe', 'select, insert, update, delete'));

\echo ''
rollback;
