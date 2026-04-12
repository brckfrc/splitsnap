-- SplitSnap Week 4 — expenses, expense_shares, settlements
-- Spec: docs/DATABASE.md §3.5-3.7, §4, §5.5, §5.7
-- Depends on: 20260405140000_week3_core.sql (profiles, groups, group_members,
--   is_group_member, is_group_participant, set_updated_at)

-- -----------------------------------------------------------------------------
-- 1. Tables (FK order)
-- -----------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id),
  title text not null,
  description text,
  amount numeric(12,2) not null,
  expense_date date not null,
  paid_by uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  split_type text not null,
  receipt_storage_path text,
  ocr_suggestions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_split_type_check check (split_type in ('equal', 'manual'))
);

create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount numeric(12,2) not null,
  primary key (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id),
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint settlements_amount_positive check (amount > 0)
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
create index idx_expenses_group_active
  on public.expenses (group_id)
  where deleted_at is null;

create index idx_expense_shares_user
  on public.expense_shares (user_id);

create index idx_settlements_group_active
  on public.settlements (group_id)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security + policies
-- -----------------------------------------------------------------------------
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

-- expenses ----

create policy expenses_select_participant
  on public.expenses
  for select
  to authenticated
  using (
    public.is_group_participant(group_id)
  );

create policy expenses_insert_active_member
  on public.expenses
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = (select auth.uid())
  );

create policy expenses_update_creator_or_owner
  on public.expenses
  for update
  to authenticated
  using (
    public.is_group_member(group_id)
    and (
      created_by = (select auth.uid())
      or exists (
        select 1
        from public.groups g
        where g.id = expenses.group_id
          and g.owner_id = (select auth.uid())
      )
    )
  )
  with check (
    public.is_group_member(group_id)
    and (
      created_by = (select auth.uid())
      or exists (
        select 1
        from public.groups g
        where g.id = expenses.group_id
          and g.owner_id = (select auth.uid())
      )
    )
  );

-- expense_shares ----

create policy expense_shares_select_participant
  on public.expense_shares
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_shares.expense_id
        and public.is_group_participant(e.group_id)
    )
  );

create policy expense_shares_insert_active_member
  on public.expense_shares
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_shares.expense_id
        and public.is_group_member(e.group_id)
    )
  );

create policy expense_shares_update_active_member
  on public.expense_shares
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_shares.expense_id
        and public.is_group_member(e.group_id)
    )
  )
  with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_shares.expense_id
        and public.is_group_member(e.group_id)
    )
  );

create policy expense_shares_delete_active_member
  on public.expense_shares
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_shares.expense_id
        and public.is_group_member(e.group_id)
    )
  );

-- settlements ----

create policy settlements_select_participant
  on public.settlements
  for select
  to authenticated
  using (
    public.is_group_participant(group_id)
  );

create policy settlements_insert_involved_member
  on public.settlements
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and (
      from_user_id = (select auth.uid())
      or to_user_id = (select auth.uid())
    )
  );

-- settlements: no UPDATE policy (immutable; wrong entry → soft delete + new record)
-- settlements: soft delete via UPDATE on deleted_at

create policy settlements_soft_delete_involved
  on public.settlements
  for update
  to authenticated
  using (
    public.is_group_member(group_id)
    and (
      from_user_id = (select auth.uid())
      or to_user_id = (select auth.uid())
    )
  )
  with check (
    public.is_group_member(group_id)
    and (
      from_user_id = (select auth.uid())
      or to_user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Realtime
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_shares;
alter publication supabase_realtime add table public.settlements;
