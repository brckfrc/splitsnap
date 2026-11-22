-- Tests for invite codes, settlement RLS and receipt storage scoping. Written as
-- characterisation tests in Sprint #13; Sprint #6
-- (20261122200000_sprint6_backend_hardening.sql) made settlements immutable
-- except for the soft delete, rejects self-payments and requires the
-- counterparty to belong to the group.
--
-- Run against a local stack (supabase start): `npm run test:db`.
--
-- Every check prints PASS or FAIL. `npm run test:db` (scripts/test-db.sh) runs
-- every suite and fails on any FAIL or ERROR; CI runs it on each PR.

\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

begin;

-- -----------------------------------------------------------------------------
-- Fixture: alice owns "Trip" (code TRIPCODE); bob is a member; carol left;
-- mallory and newbie are outsiders. "Gone" is a deleted group.
-- -----------------------------------------------------------------------------
create temporary table ids (name text primary key, id uuid);
insert into ids (name, id) values
  ('alice',   '11111111-1111-1111-1111-111111111111'),
  ('bob',     '22222222-2222-2222-2222-222222222222'),
  ('carol',   '44444444-4444-4444-4444-444444444444'),
  ('mallory', '33333333-3333-3333-3333-333333333333'),
  ('newbie',  '55555555-5555-5555-5555-555555555555');
grant select on ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', name || '@example.com'
from ids;

insert into public.groups (id, name, owner_id, invite_code)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Trip', (select id from ids where name = 'alice'), 'TRIPCODE');
insert into public.groups (id, name, owner_id, invite_code, deleted_at)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'Gone', (select id from ids where name = 'alice'), 'GONECODE', now());

insert into public.group_members (group_id, user_id, role, left_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'bob'), 'member', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', (select id from ids where name = 'carol'), 'member', now());

insert into public.settlements (id, group_id, from_user_id, to_user_id, amount)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        (select id from ids where name = 'bob'), (select id from ids where name = 'alice'), 50);

insert into storage.objects (bucket_id, name)
values ('receipts', 'aaaaaaaa-0000-0000-0000-000000000001/existing.jpg');

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

-- An RLS USING clause that hides a row makes an UPDATE a silent no-op, so the
-- row count is the only observable signal.
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

-- -----------------------------------------------------------------------------
-- Invite codes (join_group_by_invite)
-- -----------------------------------------------------------------------------
select pg_temp.act_as('newbie');
select pg_temp.check_true('invite: code is trimmed and case-insensitive',
  public.join_group_by_invite('  tripcode ') = 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check_true('invite: joiner becomes an active member',
  public.is_group_member('aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check_ok('invite: joining again is idempotent',
  $$select public.join_group_by_invite('TRIPCODE')$$);
select pg_temp.check_raises('invite: unknown code is rejected',
  $$select public.join_group_by_invite('NOPE1234')$$, 'invalid_invite_code');
select pg_temp.check_raises('invite: blank code is rejected',
  $$select public.join_group_by_invite('   ')$$, 'invalid_invite_code');
select pg_temp.check_raises('invite: a deleted group cannot be joined',
  $$select public.join_group_by_invite('GONECODE')$$, 'invalid_invite_code');

select pg_temp.act_as('carol');
-- Two statements: is_group_member is STABLE, so in the same statement as the
-- join it would still see the pre-join snapshot.
select pg_temp.check_true('invite: a member who left gets the group back',
  public.join_group_by_invite('TRIPCODE') = 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check_true('invite: and is an active member again',
  public.is_group_member('aaaaaaaa-0000-0000-0000-000000000001'));

reset role;
select pg_temp.check_true('invite: no duplicate membership rows',
  (select count(*) from public.group_members
   where group_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     and user_id in (select id from ids where name in ('newbie', 'carol'))) = 2);
-- Put carol back to "left" for the cases below.
update public.group_members set left_at = now()
where group_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = (select id from ids where name = 'carol');

-- -----------------------------------------------------------------------------
-- Settlements RLS
-- -----------------------------------------------------------------------------
select pg_temp.act_as('bob');
select pg_temp.check_ok('settlement: member records own payment',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'bob'), (select id from ids where name = 'alice'), 10)$$);
select pg_temp.check_raises('settlement: member cannot book a payment between two others',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'newbie'), (select id from ids where name = 'alice'), 10)$$,
  'new row violates row-level security policy for table "settlements"');
select pg_temp.check_raises('settlement: amount must be positive',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'bob'), (select id from ids where name = 'alice'), 0)$$,
  'new row for relation "settlements" violates check constraint "settlements_amount_positive"');

select pg_temp.act_as('mallory');
select pg_temp.check_true('settlement: outsider sees no payments',
  (select count(*) from public.settlements where group_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0);
select pg_temp.check_raises('settlement: outsider cannot record a payment to themself',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'alice'), (select id from ids where name = 'mallory'), 10)$$,
  'new row violates row-level security policy for table "settlements"');

select pg_temp.act_as('carol');
select pg_temp.check_true('settlement: former member still reads the history',
  (select count(*) from public.settlements where group_id = 'aaaaaaaa-0000-0000-0000-000000000001') >= 1);
select pg_temp.check_raises('settlement: former member cannot record a payment',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'carol'), (select id from ids where name = 'alice'), 10)$$,
  'new row violates row-level security policy for table "settlements"');

select pg_temp.act_as('newbie');
select pg_temp.check_true('settlement: uninvolved member cannot delete a payment',
  pg_temp.rows_affected($$update public.settlements set deleted_at = now()
                          where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$) = 0);

select pg_temp.act_as('alice');
select pg_temp.check_true('settlement: the recipient can soft-delete it',
  pg_temp.rows_affected($$update public.settlements set deleted_at = now()
                          where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$) = 1);

-- Sprint #6: a recorded payment is frozen apart from deleted_at, and both
-- parties must be real, distinct group participants.
select pg_temp.act_as('bob');
select pg_temp.check_raises('settlement: a party cannot rewrite the amount',
  $$update public.settlements set amount = 1
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'permission denied for table settlements');
select pg_temp.check_raises('settlement: a party cannot redirect the payment',
  $$update public.settlements set to_user_id = (select id from ids where name = 'newbie')
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'permission denied for table settlements');
select pg_temp.check_raises('settlement: a party cannot swap the payer',
  $$update public.settlements set from_user_id = (select id from ids where name = 'alice'),
                                  to_user_id = (select id from ids where name = 'bob')
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'permission denied for table settlements');
select pg_temp.check_true('settlement: the frozen row is unchanged',
  (select amount = 50 and from_user_id = (select id from ids where name = 'bob')
   from public.settlements where id = 'bbbbbbbb-0000-0000-0000-000000000001'));
select pg_temp.check_raises('settlement: a payment to yourself is rejected',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'bob'), (select id from ids where name = 'bob'), 10)$$,
  'new row for relation "settlements" violates check constraint "settlements_distinct_users"');
select pg_temp.check_raises('settlement: a payment to someone outside the group is rejected',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'bob'), (select id from ids where name = 'mallory'), 10)$$,
  'new row violates row-level security policy for table "settlements"');
select pg_temp.check_raises('settlement: a payment from someone outside the group is rejected',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'mallory'), (select id from ids where name = 'bob'), 10)$$,
  'new row violates row-level security policy for table "settlements"');
select pg_temp.check_ok('settlement: settling up with a former member still works',
  $$insert into public.settlements (group_id, from_user_id, to_user_id, amount)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            (select id from ids where name = 'bob'), (select id from ids where name = 'carol'), 10)$$);

-- -----------------------------------------------------------------------------
-- Receipt storage: the first path segment is the group id
-- -----------------------------------------------------------------------------
select pg_temp.act_as('bob');
select pg_temp.check_ok('receipt: member uploads under the group path',
  $$insert into storage.objects (bucket_id, name)
    values ('receipts', 'aaaaaaaa-0000-0000-0000-000000000001/bob.jpg')$$);
select pg_temp.check_true('receipt: member reads the group''s receipts',
  (select count(*) from storage.objects
   where bucket_id = 'receipts' and name like 'aaaaaaaa-0000-0000-0000-000000000001/%') >= 1);

select pg_temp.act_as('mallory');
select pg_temp.check_raises('receipt: outsider cannot upload into the group',
  $$insert into storage.objects (bucket_id, name)
    values ('receipts', 'aaaaaaaa-0000-0000-0000-000000000001/mallory.jpg')$$,
  'new row violates row-level security policy for table "objects"');
select pg_temp.check_true('receipt: outsider cannot read the group''s receipts',
  (select count(*) from storage.objects
   where bucket_id = 'receipts' and name like 'aaaaaaaa-0000-0000-0000-000000000001/%') = 0);

select pg_temp.act_as('carol');
select pg_temp.check_true('receipt: former member still reads old receipts',
  (select count(*) from storage.objects
   where bucket_id = 'receipts' and name = 'aaaaaaaa-0000-0000-0000-000000000001/existing.jpg') = 1);
select pg_temp.check_raises('receipt: former member cannot upload',
  $$insert into storage.objects (bucket_id, name)
    values ('receipts', 'aaaaaaaa-0000-0000-0000-000000000001/carol.jpg')$$,
  'new row violates row-level security policy for table "objects"');

\echo ''
rollback;
