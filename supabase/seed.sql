-- Local development seed. Runs automatically after the migrations on every `supabase db reset`
-- ([db.seed] in config.toml). It NEVER runs against the hosted project: `db push` does not seed
-- unless --include-seed is passed, and nobody should pass it.
--
-- Creates the three screenshot test accounts, "Test grubu" (owner Deniz, members Mert and Sude)
-- and two expenses Deniz paid, so the settlement screen opens with real balances:
--   Deniz +3.000 · Mert -1.500 · Sude -1.500
--
-- Password for all three LOCAL accounts: localdev123
-- This is a local-only throwaway value: it is not the production password and only exists in the
-- Docker database on this machine.

-- -----------------------------------------------------------------------------
-- Accounts (auth.users + auth.identities; profiles come from the handle_new_user trigger)
-- -----------------------------------------------------------------------------
with accounts (id, email, full_name) as (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'deniz@borak.dev', 'Deniz Arslan'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'mert@borak.dev',  'Mert Doğan'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'sude@borak.dev',  'Sude Yıldırım')
)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  -- GoTrue scans these into Go strings; NULL makes sign-in fail, so they must be ''.
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
  extensions.crypt('localdev123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', ''
from accounts;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id in ('d0000000-0000-4000-8000-000000000001',
               'd0000000-0000-4000-8000-000000000002',
               'd0000000-0000-4000-8000-000000000003');

-- -----------------------------------------------------------------------------
-- Test grubu (the owner trigger adds Deniz as a member)
-- -----------------------------------------------------------------------------
insert into public.groups (id, name, owner_id, invite_code)
values ('a0000000-0000-4000-8000-000000000001', 'Test grubu',
        'd0000000-0000-4000-8000-000000000001', 'LOCALTST');

insert into public.group_members (group_id, user_id, role)
values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'member'),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'member');

-- -----------------------------------------------------------------------------
-- Two equal-split expenses paid by Deniz
-- -----------------------------------------------------------------------------
insert into public.expenses (id, group_id, title, amount, expense_date, paid_by, created_by, split_type, icon)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Kafe',
   1500.00, current_date - 7, 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'equal', '🍔'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Test Yemeği',
   3000.00, current_date - 2, 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'equal', '📝');

insert into public.expense_shares (expense_id, user_id, amount)
select e.id, m.user_id, e.amount / 3
from public.expenses e
cross join (values ('d0000000-0000-4000-8000-000000000001'::uuid),
                   ('d0000000-0000-4000-8000-000000000002'::uuid),
                   ('d0000000-0000-4000-8000-000000000003'::uuid)) as m(user_id)
where e.group_id = 'a0000000-0000-4000-8000-000000000001';

insert into public.expense_payers (expense_id, user_id, amount)
select id, paid_by, amount
from public.expenses
where group_id = 'a0000000-0000-4000-8000-000000000001';
