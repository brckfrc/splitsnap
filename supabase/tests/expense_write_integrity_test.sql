-- Manual verification for 20260727215500_expense_write_integrity.sql.
--
-- Run against a local stack (supabase start):
--   docker exec -i supabase_db_splitsnap psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/expense_write_integrity_test.sql
--
-- Every check prints PASS or FAIL. Not wired into CI; there is no test runner
-- in this project yet.

\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

begin;

-- -----------------------------------------------------------------------------
-- Fixture: one group owned by alice, with bob as a member. mallory owns her own
-- unrelated group and is a member of alice's group too. carol is in no group.
-- -----------------------------------------------------------------------------
create temporary table ids (name text primary key, id uuid);

insert into ids (name, id) values
  ('alice',   '11111111-1111-1111-1111-111111111111'),
  ('bob',     '22222222-2222-2222-2222-222222222222'),
  ('mallory', '33333333-3333-3333-3333-333333333333'),
  ('carol',   '44444444-4444-4444-4444-444444444444'),
  ('dave',    '55555555-5555-5555-5555-555555555555');

-- The checks below run with role = authenticated, so the fixture tables have to
-- stay readable from there.
grant select on ids to authenticated;

-- Nothing else is granted here on purpose. The privileges the client role needs
-- come from 20260727223000_codify_role_grants.sql, so this file doubles as a
-- check that a database built from migrations alone is actually usable: if that
-- migration is wrong, the RLS checks below fail with "permission denied" rather
-- than passing for the wrong reason.

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', name || '@example.com'
from ids;

insert into public.groups (id, name, owner_id, invite_code)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Trip', (select id from ids where name = 'alice'), 'TRIPCODE'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Mallory Solo', (select id from ids where name = 'mallory'), 'MALLCODE');

-- The owner-membership trigger already added alice / mallory to their own groups.
insert into public.group_members (group_id, user_id, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'bob'), 'member'),
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'mallory'), 'member');

-- dave was in the group and left: historical expenses still reference him.
insert into public.group_members (group_id, user_id, role, left_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'dave'), 'member', now());

create or replace function pg_temp.act_as(_name text)
returns void language plpgsql as $$
declare _id uuid;
begin
  select id into _id from ids where name = _name;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', _id, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.check_raises(_label text, _sql text, _expect text)
returns void language plpgsql as $$
begin
  execute _sql;
  raise notice 'FAIL  %  (expected %, statement succeeded)', _label, _expect;
exception when others then
  if sqlerrm = _expect then
    raise notice 'PASS  %', _label;
  else
    raise notice 'FAIL  %  (expected %, got %)', _label, _expect, sqlerrm;
  end if;
end;
$$;

create or replace function pg_temp.check_ok(_label text, _sql text)
returns void language plpgsql as $$
begin
  execute _sql;
  raise notice 'PASS  %', _label;
exception when others then
  raise notice 'FAIL  %  (unexpected %)', _label, sqlerrm;
end;
$$;

-- Runs a write as the current (authenticated) role and reports how many rows it
-- touched. An RLS USING clause that blocks the row makes the statement a no-op
-- rather than an error, so row count is the only observable signal.
create or replace function pg_temp.rows_affected(_sql text)
returns bigint language plpgsql as $$
declare _n bigint;
begin
  execute _sql;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

create or replace function pg_temp.check_true(_label text, _cond boolean)
returns void language plpgsql as $$
begin
  if _cond then raise notice 'PASS  %', _label;
  else raise notice 'FAIL  %', _label;
  end if;
end;
$$;

\set QUIET off
\echo ''
\echo '--- happy path -----------------------------------------------------------'

select pg_temp.act_as('alice');

select pg_temp.check_ok(
  'equal split with exact sums is accepted',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Dinner', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":50.00},
        {"user_id":"22222222-2222-2222-2222-222222222222","amount":50.00}]'::jsonb,
      null, null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00}]'::jsonb)$$);

select pg_temp.check_ok(
  'one kurus of rounding drift is tolerated',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Coffee', null, 10.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'manual', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":3.33},
        {"user_id":"22222222-2222-2222-2222-222222222222","amount":6.66}]'::jsonb,
      null, null, '[]'::jsonb)$$);

select pg_temp.check_ok(
  'a member who has left can still be allocated (historical expense)',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Old taxi', null, 40.00, current_date,
      '55555555-5555-5555-5555-555555555555', 'equal', null,
      '[{"user_id":"55555555-5555-5555-5555-555555555555","amount":20.00},
        {"user_id":"11111111-1111-1111-1111-111111111111","amount":20.00}]'::jsonb,
      null, null, '[]'::jsonb)$$);

\echo ''
\echo '--- RPC validation (critical #2) -----------------------------------------'

select pg_temp.check_raises(
  'shares that do not add up to the total are rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'manual', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":10.00}]'::jsonb,
      null, null, '[]'::jsonb)$$,
  'share_total_mismatch');

select pg_temp.check_raises(
  'payers that do not add up to the total are rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00}]'::jsonb,
      null, null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":250.00}]'::jsonb)$$,
  'payer_total_mismatch');

select pg_temp.check_raises(
  'a share for a non-member is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[{"user_id":"44444444-4444-4444-4444-444444444444","amount":100.00}]'::jsonb,
      null, null, '[]'::jsonb)$$,
  'share_not_in_group');

select pg_temp.check_raises(
  'a payer outside the group is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00}]'::jsonb,
      null, null,
      '[{"user_id":"44444444-4444-4444-4444-444444444444","amount":100.00}]'::jsonb)$$,
  'payer_not_in_group');

select pg_temp.check_raises(
  'p_paid_by outside the group is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '44444444-4444-4444-4444-444444444444', 'equal', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00}]'::jsonb,
      null, null, '[]'::jsonb)$$,
  'payer_not_in_group');

select pg_temp.check_raises(
  'a negative share amount is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'manual', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":150.00},
        {"user_id":"22222222-2222-2222-2222-222222222222","amount":-50.00}]'::jsonb,
      null, null, '[]'::jsonb)$$,
  'invalid_share_amount');

select pg_temp.check_raises(
  'an empty share list is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[]'::jsonb, null, null, '[]'::jsonb)$$,
  'no_shares');

select pg_temp.check_raises(
  'a receipt path pointing at another group is rejected',
  $$select public.create_expense_with_shares(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Bad', null, 100.00, current_date,
      '11111111-1111-1111-1111-111111111111', 'equal', null,
      '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00}]'::jsonb,
      'aaaaaaaa-0000-0000-0000-000000000002/stolen.jpg', null, '[]'::jsonb)$$,
  'invalid_receipt_path');

\echo ''
\echo '--- cross-group expense hijack (critical #3) -----------------------------'

-- alice creates an expense in the Trip group; mallory is only a plain member
-- there, but she owns her own group. Before the fix she could pass her own
-- group as p_group_id and rewrite this expense anyway.
create temporary table victim as
select public.create_expense_with_shares(
  'aaaaaaaa-0000-0000-0000-000000000001', 'Alice dinner', null, 200.00, current_date,
  '11111111-1111-1111-1111-111111111111', 'equal', null,
  '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00},
    {"user_id":"22222222-2222-2222-2222-222222222222","amount":100.00}]'::jsonb,
  null, null, '[]'::jsonb) as id;

grant select on victim to authenticated;

select pg_temp.act_as('mallory');

select pg_temp.check_raises(
  'a group owner cannot update an expense belonging to another group',
  format(
    $$select public.update_expense_with_shares(
        %L, 'aaaaaaaa-0000-0000-0000-000000000002', 'Hijacked', null, 1.00, current_date,
        'equal', null,
        '[{"user_id":"33333333-3333-3333-3333-333333333333","amount":1.00}]'::jsonb,
        null, null, '[]'::jsonb)$$,
    (select id from victim)),
  'expense_not_found');

select pg_temp.check_raises(
  'a plain member cannot update someone else''s expense in their own group',
  format(
    $$select public.update_expense_with_shares(
        %L, 'aaaaaaaa-0000-0000-0000-000000000001', 'Hijacked', null, 200.00, current_date,
        'equal', null,
        '[{"user_id":"33333333-3333-3333-3333-333333333333","amount":200.00}]'::jsonb,
        null, null, '[]'::jsonb)$$,
    (select id from victim)),
  'unauthorized');

select pg_temp.check_true(
  'the victim expense is untouched',
  (select title = 'Alice dinner' and amount = 200.00
   from public.expenses where id = (select id from victim)));

\echo ''
\echo '--- expense_payers RLS (critical #1) -------------------------------------'

-- mallory is an active member of the Trip group but did not create this
-- expense and does not own the group, so she must not be able to rewrite who
-- paid for it through PostgREST.
select pg_temp.check_true(
  'a non-creator member cannot UPDATE expense_payers',
  pg_temp.rows_affected(format(
    $$update public.expense_payers
      set user_id = '33333333-3333-3333-3333-333333333333'
      where expense_id = %L$$,
    (select id from victim))) = 0);

select pg_temp.check_true(
  'a non-creator member cannot DELETE expense_payers',
  pg_temp.rows_affected(format(
    $$delete from public.expense_payers where expense_id = %L$$,
    (select id from victim))) = 0);

select pg_temp.check_raises(
  'a non-creator member cannot INSERT expense_payers',
  format(
    $$insert into public.expense_payers (expense_id, user_id, amount)
      values (%L, '33333333-3333-3333-3333-333333333333', 999.00)$$,
    (select id from victim)),
  'new row violates row-level security policy for table "expense_payers"');

select pg_temp.check_true(
  'the original payer row survived',
  (select count(*) = 1
   from public.expense_payers
   where expense_id = (select id from victim)
     and user_id = '11111111-1111-1111-1111-111111111111'
     and amount = 200.00));

-- The creator is still allowed to fix her own expense.
select pg_temp.act_as('alice');

select pg_temp.check_ok(
  'the expense creator can still update the payers',
  format(
    $$select public.update_expense_with_shares(
        %L, 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice dinner', null, 200.00, current_date,
        'equal', null,
        '[{"user_id":"11111111-1111-1111-1111-111111111111","amount":100.00},
          {"user_id":"22222222-2222-2222-2222-222222222222","amount":100.00}]'::jsonb,
        null, null,
        '[{"user_id":"22222222-2222-2222-2222-222222222222","amount":200.00}]'::jsonb)$$,
    (select id from victim)));

\echo ''
rollback;
