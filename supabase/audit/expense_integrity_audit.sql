-- Read-only integrity audit. Safe to paste into the Supabase SQL editor on the
-- hosted project; it only reads.
--
-- Why this exists: until 20260727215500 the expense RPCs accepted any shares and
-- payers a client sent. An expense whose shares or payers do not add up to its
-- total makes the group's balances stop summing to zero, and a balance that
-- cannot reach zero shows up as a debt or credit that no suggested payment ever
-- clears. The migration stops new ones; it does not repair rows written before
-- it. Query 1 tells you whether any exist.

-- -----------------------------------------------------------------------------
-- 1. Expenses whose shares or payers do not add up to the total
-- -----------------------------------------------------------------------------
select
  g.name                            as grup,
  e.id                              as expense_id,
  e.title,
  e.expense_date,
  e.amount                          as tutar,
  coalesce(s.total, 0)              as pay_toplami,
  coalesce(p.total, 0)              as odeyen_toplami,
  round(coalesce(s.total, 0) - e.amount, 2) as pay_farki,
  round(coalesce(p.total, 0) - e.amount, 2) as odeyen_farki
from public.expenses e
  join public.groups g on g.id = e.group_id
  left join (
    select expense_id, sum(amount) as total
    from public.expense_shares group by expense_id
  ) s on s.expense_id = e.id
  left join (
    select expense_id, sum(amount) as total
    from public.expense_payers group by expense_id
  ) p on p.expense_id = e.id
where e.deleted_at is null
  and (
    abs(coalesce(s.total, 0) - e.amount) > 0.01
    or abs(coalesce(p.total, 0) - e.amount) > 0.01
  )
order by g.name, e.expense_date;

-- -----------------------------------------------------------------------------
-- 2. Net balance per member per group
-- -----------------------------------------------------------------------------
-- Mirrors calculateBalances() in src/utils/settlement.ts:
--   paid + settlements sent - own shares - settlements received.
-- The `net_toplam` column must be 0.00 for every group. Anything else is money
-- the app can never settle, and query 1 usually explains it.
with paid as (
  select e.group_id, p.user_id, sum(p.amount) as amount
  from public.expense_payers p
    join public.expenses e on e.id = p.expense_id and e.deleted_at is null
  group by e.group_id, p.user_id
),
owed as (
  select e.group_id, s.user_id, sum(s.amount) as amount
  from public.expense_shares s
    join public.expenses e on e.id = s.expense_id and e.deleted_at is null
  group by e.group_id, s.user_id
),
sent as (
  select group_id, from_user_id as user_id, sum(amount) as amount
  from public.settlements where deleted_at is null group by group_id, from_user_id
),
received as (
  select group_id, to_user_id as user_id, sum(amount) as amount
  from public.settlements where deleted_at is null group by group_id, to_user_id
),
combined as (
  select group_id, user_id from paid
  union select group_id, user_id from owed
  union select group_id, user_id from sent
  union select group_id, user_id from received
)
select
  g.name as grup,
  pr.display_name as uye,
  coalesce(paid.amount, 0)     as odedigi,
  coalesce(owed.amount, 0)     as payi,
  coalesce(sent.amount, 0)     as odeme_yapti,
  coalesce(received.amount, 0) as odeme_aldi,
  round(
    coalesce(paid.amount, 0) + coalesce(sent.amount, 0)
    - coalesce(owed.amount, 0) - coalesce(received.amount, 0), 2
  ) as net,
  round(sum(
    coalesce(paid.amount, 0) + coalesce(sent.amount, 0)
    - coalesce(owed.amount, 0) - coalesce(received.amount, 0)
  ) over (partition by c.group_id), 2) as net_toplam
from combined c
  join public.groups g on g.id = c.group_id
  join public.profiles pr on pr.id = c.user_id
  left join paid     on paid.group_id = c.group_id     and paid.user_id = c.user_id
  left join owed     on owed.group_id = c.group_id     and owed.user_id = c.user_id
  left join sent     on sent.group_id = c.group_id     and sent.user_id = c.user_id
  left join received on received.group_id = c.group_id and received.user_id = c.user_id
where g.deleted_at is null
order by g.name, net desc;

-- -----------------------------------------------------------------------------
-- 3. Shares or payers belonging to someone who was never in the group
-- -----------------------------------------------------------------------------
-- These drop out of the balance math entirely (calculateBalances only counts
-- user ids present in the member list), so they break the zero-sum silently.
select 'share' as tip, e.group_id, e.id as expense_id, e.title, sh.user_id, sh.amount
from public.expense_shares sh
  join public.expenses e on e.id = sh.expense_id and e.deleted_at is null
where not exists (
  select 1 from public.group_members m
  where m.group_id = e.group_id and m.user_id = sh.user_id
)
union all
select 'payer', e.group_id, e.id, e.title, p.user_id, p.amount
from public.expense_payers p
  join public.expenses e on e.id = p.expense_id and e.deleted_at is null
where not exists (
  select 1 from public.group_members m
  where m.group_id = e.group_id and m.user_id = p.user_id
);

-- -----------------------------------------------------------------------------
-- 4. Expenses with no payer row at all
-- -----------------------------------------------------------------------------
-- Their total is owed by the participants but credited to nobody, so the group
-- can never balance. Should be empty; expenses created before the multi-payer
-- migration were backfilled from expenses.paid_by.
select e.id, e.group_id, e.title, e.amount, e.paid_by
from public.expenses e
where e.deleted_at is null
  and not exists (select 1 from public.expense_payers p where p.expense_id = e.id);
