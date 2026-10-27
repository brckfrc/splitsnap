-- Write integrity for expenses: who paid, who owes, and how much.
--
-- Three separate holes, all of which let a client move real money around in a
-- group's balances. Balances are derived entirely from expense_shares and
-- expense_payers, so anything writable there is writable in the ledger.
--
--   1. expense_payers write policies only require is_group_member(). When the
--      table landed in 20260726172500_split_payer.sql the pre-SEC-01 policy
--      shape was copied, so any member can POST/PATCH/DELETE payers on an
--      expense someone else created and reassign who fronted the money.
--
--   2. The expense RPCs never checked that the shares add up to the expense
--      total, that the payers add up to the total, or that the user_ids being
--      credited/debited belong to the group at all. A client bug or a direct
--      RPC call could persist an expense whose numbers never settle to zero.
--
--   3. update_expense_with_shares stopped scoping the expense lookup to
--      p_group_id (the clause was present in 20260529000000 and dropped in
--      20260726172500). Since the function is SECURITY DEFINER, RLS never
--      re-checks it: passing p_group_id = a group you own together with the id
--      of an expense in *any other group* passes the owner branch of the
--      authorization check. Any group owner could rewrite any expense in the
--      database. Restored below.

-- -----------------------------------------------------------------------------
-- 1. expense_payers: mirror the hardened expense_shares policies (SEC-01)
-- -----------------------------------------------------------------------------
-- SELECT stays as-is (any participant, incl. left members, may read history).
-- Writes now require the caller to be the expense creator or the group owner,
-- exactly like expense_shares.

drop policy if exists expense_payers_insert_active_member on public.expense_payers;
drop policy if exists expense_payers_update_active_member on public.expense_payers;
drop policy if exists expense_payers_delete_active_member on public.expense_payers;

create policy expense_payers_insert_active_member
  on public.expense_payers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.expenses e
        join public.groups g on g.id = e.group_id
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
        and (
          e.created_by = (select auth.uid())
          or g.owner_id = (select auth.uid())
        )
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
        join public.groups g on g.id = e.group_id
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
        and (
          e.created_by = (select auth.uid())
          or g.owner_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.expenses e
        join public.groups g on g.id = e.group_id
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
        and (
          e.created_by = (select auth.uid())
          or g.owner_id = (select auth.uid())
        )
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
        join public.groups g on g.id = e.group_id
      where e.id = expense_payers.expense_id
        and public.is_group_member(e.group_id)
        and (
          e.created_by = (select auth.uid())
          or g.owner_id = (select auth.uid())
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Shared allocation guard used by both RPCs
-- -----------------------------------------------------------------------------
-- _kind is 'share' or 'payer' and only shapes the error code, so the client can
-- tell the two failures apart.
--
-- Membership is checked against group_members *ignoring left_at*: an expense
-- from before someone left still lists them, and editing that expense has to
-- keep working. The point of the check is to reject user_ids from outside the
-- group entirely, not to freeze history when a member leaves.
--
-- Amounts are compared after round(…, 2) because both columns are numeric(12,2)
-- and the comparison has to be against what actually gets stored. The 0.01
-- tolerance absorbs a single kuruş of equal-split rounding drift.
create or replace function public.validate_expense_allocations(
  _group_id uuid,
  _entries  jsonb,
  _total    numeric,
  _kind     text
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  _sum      numeric;
  _count    bigint;
  _distinct bigint;
begin
  if _entries is null or jsonb_typeof(_entries) <> 'array' then
    raise exception 'invalid_%_payload', _kind;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(_entries) as elem
    where elem->>'user_id' is null
       or elem->>'amount' is null
  ) then
    raise exception 'invalid_%_payload', _kind;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(_entries) as elem
    where (elem->>'amount')::numeric <= 0
  ) then
    raise exception 'invalid_%_amount', _kind;
  end if;

  -- The (expense_id, user_id) primary key would catch this as a unique
  -- violation, but as a raw Postgres error rather than a code the client
  -- can map.
  select count(*), count(distinct (elem->>'user_id')::uuid)
    into _count, _distinct
  from jsonb_array_elements(_entries) as elem;

  if _count <> _distinct then
    raise exception 'duplicate_%_user', _kind;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(_entries) as elem
    where not exists (
      select 1
      from public.group_members m
      where m.group_id = _group_id
        and m.user_id = (elem->>'user_id')::uuid
    )
  ) then
    raise exception '%_not_in_group', _kind;
  end if;

  select coalesce(sum(round((elem->>'amount')::numeric, 2)), 0)
    into _sum
  from jsonb_array_elements(_entries) as elem;

  if abs(_sum - round(_total, 2)) > 0.01 then
    raise exception '%_total_mismatch', _kind;
  end if;
end;
$$;

revoke all on function public.validate_expense_allocations(uuid, jsonb, numeric, text) from public;

comment on function public.validate_expense_allocations(uuid, jsonb, numeric, text) is
  'Internal guard for the expense RPCs. Not granted to any client role.';

-- -----------------------------------------------------------------------------
-- 3. create_expense_with_shares — same signature, guarded body
-- -----------------------------------------------------------------------------
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
  _paid_by    uuid := coalesce(p_paid_by, auth.uid());
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

  -- Storage RLS derives the group from the first path segment, so a path
  -- pointing at another group's folder would attach an image the members of
  -- this group can't read (and expose one they shouldn't reference).
  if p_receipt_storage_path is not null
     and p_receipt_storage_path !~ ('^' || p_group_id::text || '/[^/]+$') then
    raise exception 'invalid_receipt_path';
  end if;

  if not exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id and m.user_id = _paid_by
  ) then
    raise exception 'payer_not_in_group';
  end if;

  if p_shares is null or jsonb_array_length(p_shares) = 0 then
    raise exception 'no_shares';
  end if;
  perform public.validate_expense_allocations(p_group_id, p_shares, p_amount, 'share');

  if jsonb_array_length(coalesce(p_payers, '[]'::jsonb)) > 0 then
    perform public.validate_expense_allocations(p_group_id, p_payers, p_amount, 'payer');
  end if;

  insert into public.expenses (
    group_id, title, description, amount, expense_date,
    paid_by, created_by, split_type, icon,
    receipt_storage_path, ocr_suggestions
  )
  values (
    p_group_id, trim(p_title), nullif(trim(p_description), ''),
    p_amount, p_expense_date,
    _paid_by, _uid, p_split_type, p_icon,
    p_receipt_storage_path, p_ocr_suggestions
  )
  returning id into _expense_id;

  insert into public.expense_shares (expense_id, user_id, amount)
  select _expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  from jsonb_array_elements(p_shares) as elem
  where (elem->>'amount')::numeric > 0;

  if jsonb_array_length(coalesce(p_payers, '[]'::jsonb)) > 0 then
    insert into public.expense_payers (expense_id, user_id, amount)
    select _expense_id,
           (elem->>'user_id')::uuid,
           (elem->>'amount')::numeric
    from jsonb_array_elements(p_payers) as elem
    where (elem->>'amount')::numeric > 0;
  else
    insert into public.expense_payers (expense_id, user_id, amount)
    values (_expense_id, _paid_by, p_amount);
  end if;

  return _expense_id;
end;
$$;

revoke all on function public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. update_expense_with_shares — same signature, guarded body
-- -----------------------------------------------------------------------------
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

  if p_split_type not in ('equal', 'manual') then
    raise exception 'invalid_split_type';
  end if;

  -- group_id in the WHERE clause is what keeps the owner branch below from
  -- reaching outside p_group_id.
  select created_by into _created_by
  from public.expenses
  where id = p_expense_id
    and group_id = p_group_id
    and deleted_at is null;

  if _created_by is null then
    raise exception 'expense_not_found';
  end if;

  select owner_id into _owner_id
  from public.groups
  where id = p_group_id and deleted_at is null;

  if _created_by is distinct from _uid and _owner_id is distinct from _uid then
    raise exception 'unauthorized';
  end if;

  if trim(p_title) = '' then
    raise exception 'empty_title';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if p_receipt_storage_path is not null
     and p_receipt_storage_path !~ ('^' || p_group_id::text || '/[^/]+$') then
    raise exception 'invalid_receipt_path';
  end if;

  if p_shares is null or jsonb_array_length(p_shares) = 0 then
    raise exception 'no_shares';
  end if;
  perform public.validate_expense_allocations(p_group_id, p_shares, p_amount, 'share');

  if jsonb_array_length(coalesce(p_payers, '[]'::jsonb)) > 0 then
    perform public.validate_expense_allocations(p_group_id, p_payers, p_amount, 'payer');
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
  if jsonb_array_length(coalesce(p_payers, '[]'::jsonb)) > 0 then
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
