-- 1. Create public.expense_payers table
create table public.expense_payers (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12,2) not null,
  primary key (expense_id, user_id),
  constraint expense_payers_amount_positive check (amount > 0)
);

-- 2. Populate public.expense_payers with existing data from public.expenses
insert into public.expense_payers (expense_id, user_id, amount)
select id, paid_by, amount
from public.expenses;

-- 3. Make paid_by nullable in public.expenses
alter table public.expenses alter column paid_by drop not null;

-- 4. Enable Row Level Security (RLS) on public.expense_payers
alter table public.expense_payers enable row level security;

-- 5. Add RLS Policies for public.expense_payers (similar to expense_shares)
create policy expense_payers_select_participant
  on public.expense_payers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_payers.expense_id
        and public.is_group_participant(e.group_id)
    )
  );

create policy expense_payers_insert_active_member
  on public.expense_payers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
    )
  );

create policy expense_payers_update_active_member
  on public.expense_payers
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
    )
  )
  with check (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
    )
  );

create policy expense_payers_delete_active_member
  on public.expense_payers
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
    )
  );

-- 6. Add public.expense_payers to the realtime publication
alter publication supabase_realtime add table public.expense_payers;

-- 7. Update RPC: create_expense_with_shares to support p_payers jsonb
drop function if exists public.create_expense_with_shares(
  uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb
);

create or replace function public.create_expense_with_shares(
  p_group_id              uuid,
  p_title                 text,
  p_description           text    default null,
  p_amount                numeric default 0,
  p_expense_date          date    default current_date,
  p_paid_by               uuid    default null,
  p_split_type            text    default 'equal',
  p_icon                  text    default null,
  p_shares                jsonb   default '[]'::jsonb,
  p_receipt_storage_path  text    default null,
  p_ocr_suggestions       jsonb   default null,
  p_payers                jsonb   default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid        uuid := auth.uid();
  _expense_id uuid;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not_group_member';
  end if;
  if trim(p_title) = '' then
    raise exception 'empty_title';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_split_type not in ('equal', 'manual') then
    raise exception 'invalid_split_type';
  end if;

  insert into public.expenses (
    group_id, title, description, amount, expense_date,
    paid_by, created_by, split_type, icon,
    receipt_storage_path, ocr_suggestions
  )
  values (
    p_group_id, trim(p_title), nullif(trim(p_description), ''),
    p_amount, p_expense_date,
    coalesce(p_paid_by, _uid), _uid, p_split_type, p_icon,
    p_receipt_storage_path, p_ocr_suggestions
  )
  returning id into _expense_id;

  insert into public.expense_shares (expense_id, user_id, amount)
  select _expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  from jsonb_array_elements(p_shares) as elem
  where (elem->>'amount')::numeric > 0;

  if jsonb_array_length(p_payers) > 0 then
    insert into public.expense_payers (expense_id, user_id, amount)
    select _expense_id,
           (elem->>'user_id')::uuid,
           (elem->>'amount')::numeric
    from jsonb_array_elements(p_payers) as elem
    where (elem->>'amount')::numeric > 0;
  else
    insert into public.expense_payers (expense_id, user_id, amount)
    values (_expense_id, coalesce(p_paid_by, _uid), p_amount);
  end if;

  return _expense_id;
end;
$$;

revoke all on function public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb, jsonb) to authenticated;

-- 8. Update RPC: update_expense_with_shares to support p_payers jsonb
drop function if exists public.update_expense_with_shares(
  uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb
);

create or replace function public.update_expense_with_shares(
  p_expense_id            uuid,
  p_group_id              uuid,
  p_title                 text,
  p_description           text    default null,
  p_amount                numeric default 0,
  p_expense_date          date    default current_date,
  p_split_type            text    default 'equal',
  p_icon                  text    default null,
  p_shares                jsonb   default '[]'::jsonb,
  p_receipt_storage_path  text    default null,
  p_ocr_suggestions       jsonb   default null,
  p_payers                jsonb   default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid        uuid := auth.uid();
  _created_by uuid;
  _owner_id   uuid;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not_group_member';
  end if;

  select created_by into _created_by
  from public.expenses
  where id = p_expense_id and deleted_at is null;

  if _created_by is null then
    raise exception 'expense_not_found';
  end if;

  select owner_id into _owner_id
  from public.groups
  where id = p_group_id and deleted_at is null;

  if _created_by <> _uid and coalesce(_owner_id, '') <> _uid then
    raise exception 'unauthorized';
  end if;

  if trim(p_title) = '' then
    raise exception 'empty_title';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  update public.expenses
  set title = trim(p_title),
      description = nullif(trim(p_description), ''),
      amount = p_amount,
      expense_date = p_expense_date,
      split_type = p_split_type,
      icon = p_icon,
      receipt_storage_path = coalesce(p_receipt_storage_path, receipt_storage_path),
      ocr_suggestions = coalesce(p_ocr_suggestions, ocr_suggestions),
      updated_at = now()
  where id = p_expense_id;

  delete from public.expense_shares where expense_id = p_expense_id;
  insert into public.expense_shares (expense_id, user_id, amount)
  select p_expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  from jsonb_array_elements(p_shares) as elem
  where (elem->>'amount')::numeric > 0;

  delete from public.expense_payers where expense_id = p_expense_id;
  if jsonb_array_length(p_payers) > 0 then
    insert into public.expense_payers (expense_id, user_id, amount)
    select p_expense_id,
           (elem->>'user_id')::uuid,
           (elem->>'amount')::numeric
    from jsonb_array_elements(p_payers) as elem
    where (elem->>'amount')::numeric > 0;
  else
    insert into public.expense_payers (expense_id, user_id, amount)
    values (p_expense_id, _uid, p_amount);
  end if;
end;
$$;

revoke all on function public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb, jsonb) to authenticated;
