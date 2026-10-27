-- Manual verification for 20261027120000_preserve_payers_on_update.sql.
--
-- Run against a local stack (supabase start):
--   docker exec -i supabase_db_splitsnap psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/expense_payer_preservation_test.sql
--
-- Covers the four UPDATE branches for `p_payers`: supplied, preserved,
-- pro-rated, and the single-payer fallback. The cases that send no `p_payers`
-- are what a pre-multi-payer client does on every edit.
--
-- Every check prints PASS or FAIL. Not wired into CI; there is no test runner
-- in this project yet.

\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

begin;

-- -----------------------------------------------------------------------------
-- Fixture: alice owns "Trip"; bob and mallory are members.
-- -----------------------------------------------------------------------------
create temporary table ids (name text primary key, id uuid);
insert into ids (name, id) values
  ('alice',   '11111111-1111-1111-1111-111111111111'),
  ('bob',     '22222222-2222-2222-2222-222222222222'),
  ('mallory', '33333333-3333-3333-3333-333333333333');
grant select on ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', name || '@example.com'
from ids;

insert into public.groups (id, name, owner_id, invite_code)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Trip',
        (select id from ids where name = 'alice'), 'TRIPCODE');

insert into public.group_members (group_id, user_id, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'bob'), 'member'),
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'mallory'), 'member');

create or replace function pg_temp.act_as(_name text)
returns void language plpgsql as $$
declare _id uuid;
begin
  select id into _id from ids where name = _name;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', _id, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.report(_label text, _ok boolean, _detail text default '')
returns void language plpgsql as $$
begin
  if _ok then raise notice 'PASS  %', _label;
  else raise notice 'FAIL  %  %', _label, _detail;
  end if;
end;
$$;

-- Renders the current payer set as "name=amount, ..." for failure messages.
create or replace function pg_temp.payers(_expense uuid)
returns text language sql as $$
  select coalesce(string_agg(i.name || '=' || p.amount, ', ' order by i.name), '(none)')
  from public.expense_payers p join ids i on i.id = p.user_id
  where p.expense_id = _expense;
$$;

-- An even 3-way split of _amount, as the shares payload.
create or replace function pg_temp.even_shares(_amount numeric)
returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('user_id', id, 'amount', round(_amount / 3.0, 2)))
  from ids;
$$;

-- -----------------------------------------------------------------------------
-- Case 2: amount unchanged, no p_payers -> a multi-payer split survives intact.
-- This is the one the old entry called "flattened": two payers collapsed into
-- one row for whoever did the editing.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('alice');

create temporary table e_multi (id uuid);
insert into e_multi
select public.create_expense_with_shares(
  'aaaaaaaa-0000-0000-0000-000000000001', 'Hotel', null, 100.00, current_date,
  (select id from ids where name = 'bob'), 'manual', null,
  jsonb_build_array(
    jsonb_build_object('user_id', (select id from ids where name = 'alice'),   'amount', 40.00),
    jsonb_build_object('user_id', (select id from ids where name = 'bob'),     'amount', 30.00),
    jsonb_build_object('user_id', (select id from ids where name = 'mallory'), 'amount', 30.00)
  ),
  null, null,
  jsonb_build_array(
    jsonb_build_object('user_id', (select id from ids where name = 'bob'),     'amount', 60.00),
    jsonb_build_object('user_id', (select id from ids where name = 'mallory'), 'amount', 40.00)
  )
);

select public.update_expense_with_shares(
  (select id from e_multi), 'aaaaaaaa-0000-0000-0000-000000000001',
  'Hotel (renamed)', null, 100.00, current_date, 'manual', null,
  jsonb_build_array(
    jsonb_build_object('user_id', (select id from ids where name = 'alice'),   'amount', 40.00),
    jsonb_build_object('user_id', (select id from ids where name = 'bob'),     'amount', 30.00),
    jsonb_build_object('user_id', (select id from ids where name = 'mallory'), 'amount', 30.00)
  ),
  null, null
  -- p_payers omitted: an old client edits the title only
);

select pg_temp.report(
  'title-only edit keeps a two-payer split (60/40), not flattened to the editor',
  pg_temp.payers((select id from e_multi)) = 'bob=60.00, mallory=40.00',
  '-> ' || pg_temp.payers((select id from e_multi))
);

select pg_temp.report(
  'preserved payers still add up to the amount',
  (select round(sum(amount), 2) = 100.00 from public.expense_payers
    where expense_id = (select id from e_multi))
);

-- -----------------------------------------------------------------------------
-- Case 3: amount changed, no p_payers -> payers are pro-rated, keeping shape.
-- 60/40 of 100.00 becomes 120/80 of 200.00.
-- -----------------------------------------------------------------------------
select public.update_expense_with_shares(
  (select id from e_multi), 'aaaaaaaa-0000-0000-0000-000000000001',
  'Hotel (upgraded)', null, 200.00, current_date, 'manual', null,
  jsonb_build_array(
    jsonb_build_object('user_id', (select id from ids where name = 'alice'),   'amount', 80.00),
    jsonb_build_object('user_id', (select id from ids where name = 'bob'),     'amount', 60.00),
    jsonb_build_object('user_id', (select id from ids where name = 'mallory'), 'amount', 60.00)
  ),
  null, null
);

select pg_temp.report(
  'an amount change pro-rates the payers (60/40 of 100 -> 120/80 of 200)',
  pg_temp.payers((select id from e_multi)) = 'bob=120.00, mallory=80.00',
  '-> ' || pg_temp.payers((select id from e_multi))
);

select pg_temp.report(
  'pro-rated payers add up to the new amount',
  (select round(sum(amount), 2) = 200.00 from public.expense_payers
    where expense_id = (select id from e_multi))
);

-- -----------------------------------------------------------------------------
-- Case 3, rounding edge: a payer whose pro-rated share rounds away to zero must
-- not leave the expense short of its total (the server rejects amount <= 0).
-- 99.99 / 0.01 of 100.00, re-amounted to 1.00.
-- -----------------------------------------------------------------------------
create temporary table e_tiny (id uuid);
insert into e_tiny
select public.create_expense_with_shares(
  'aaaaaaaa-0000-0000-0000-000000000001', 'Rounding', null, 100.00, current_date,
  (select id from ids where name = 'alice'), 'manual', null,
  jsonb_build_array(jsonb_build_object('user_id', (select id from ids where name = 'alice'), 'amount', 100.00)),
  null, null,
  jsonb_build_array(
    jsonb_build_object('user_id', (select id from ids where name = 'alice'), 'amount', 99.99),
    jsonb_build_object('user_id', (select id from ids where name = 'bob'),   'amount', 0.01)
  )
);

select public.update_expense_with_shares(
  (select id from e_tiny), 'aaaaaaaa-0000-0000-0000-000000000001',
  'Rounding', null, 1.00, current_date, 'manual', null,
  jsonb_build_array(jsonb_build_object('user_id', (select id from ids where name = 'alice'), 'amount', 1.00)),
  null, null
);

select pg_temp.report(
  'a payer that pro-rates below a kurus is dropped without losing the total',
  (select round(sum(amount), 2) = 1.00 from public.expense_payers
    where expense_id = (select id from e_tiny))
  and not exists (select 1 from public.expense_payers
                  where expense_id = (select id from e_tiny) and amount <= 0),
  '-> ' || pg_temp.payers((select id from e_tiny))
);

-- -----------------------------------------------------------------------------
-- Case 4: no payer rows at all -> single payer, attributed to paid_by rather
-- than to whoever happens to be editing. alice edits an expense bob paid for.
-- -----------------------------------------------------------------------------
create temporary table e_none (id uuid);
insert into e_none
select public.create_expense_with_shares(
  'aaaaaaaa-0000-0000-0000-000000000001', 'Taxi', null, 50.00, current_date,
  (select id from ids where name = 'bob'), 'equal', null,
  pg_temp.even_shares(50.00), null, null,
  jsonb_build_array(jsonb_build_object('user_id', (select id from ids where name = 'bob'), 'amount', 50.00))
);

-- Force the legacy state this branch exists for: an expense with no payer rows.
reset role;
delete from public.expense_payers where expense_id = (select id from e_none);
select pg_temp.act_as('alice');

select public.update_expense_with_shares(
  (select id from e_none), 'aaaaaaaa-0000-0000-0000-000000000001',
  'Taxi', null, 50.00, current_date, 'equal', null,
  pg_temp.even_shares(50.00), null, null
);

select pg_temp.report(
  'with no payer rows the fallback credits paid_by (bob), not the editor (alice)',
  pg_temp.payers((select id from e_none)) = 'bob=50.00',
  '-> ' || pg_temp.payers((select id from e_none))
);

-- -----------------------------------------------------------------------------
-- Case 1: a current client still wins. Supplying p_payers replaces the set.
-- -----------------------------------------------------------------------------
select public.update_expense_with_shares(
  (select id from e_none), 'aaaaaaaa-0000-0000-0000-000000000001',
  'Taxi', null, 50.00, current_date, 'equal', null,
  pg_temp.even_shares(50.00), null, null,
  jsonb_build_array(jsonb_build_object('user_id', (select id from ids where name = 'mallory'), 'amount', 50.00))
);

select pg_temp.report(
  'an explicit p_payers still replaces the payer set (new clients unaffected)',
  pg_temp.payers((select id from e_none)) = 'mallory=50.00',
  '-> ' || pg_temp.payers((select id from e_none))
);

-- A supplied payer set is still validated against the amount.
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

select pg_temp.check_raises(
  'a supplied payer set that does not add up is still rejected',
  format($$select public.update_expense_with_shares(
      %L::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
      'Taxi', null, 50.00, current_date, 'equal', null,
      pg_temp.even_shares(50.00), null, null,
      jsonb_build_array(jsonb_build_object('user_id', %L::uuid, 'amount', 10.00)))$$,
    (select id from e_none), (select id from ids where name = 'mallory')),
  'payer_total_mismatch'
);

rollback;
