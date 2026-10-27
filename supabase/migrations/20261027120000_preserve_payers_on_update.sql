-- An old client editing an expense must not reassign who paid it.
--
-- `update_expense_with_shares` treated an empty `p_payers` as "reset the payers
-- to auth.uid() for the full amount" (the branch dates back to
-- 20260726172500_split_payer.sql and was preserved verbatim in
-- 20260727215500_expense_write_integrity.sql). Every client that predates
-- multi-payer sends no `p_payers` at all — the 11-argument overloads were
-- dropped, so those calls land here with the parameter defaulted to '[]' — which
-- means a v1.0.0 user who edits nothing but the title of someone else's expense
-- silently becomes its sole payer.
--
-- Nothing in the audit catches it: the payer total still equals the expense
-- amount, so every group still sums to zero. It is wrong attribution, not broken
-- arithmetic, which is why it would only surface when someone disputes who paid.
-- `expenses.paid_by` is not touched by this RPC, so afterwards the two disagree:
-- `paid_by` still names the original payer while balances follow
-- `expense_payers`. Reproduced on a local stack on 2026-10-27 before this fix.
--
-- New rule for UPDATE: an empty `p_payers` means "leave the payers alone".
--
--   1. payers supplied      -> validate and use them (unchanged behaviour)
--   2. none supplied, rows exist, and they still add up to the new amount
--                           -> keep them exactly as they were
--   3. none supplied, rows exist, but the amount changed
--                           -> pro-rate them to the new amount, which is what
--                              `split-data.ts` `updateExpense` already does
--                              client-side, so new and old clients agree
--   4. none supplied, no rows at all
--                           -> fall back to a single payer, attributed to
--                              `expenses.paid_by` rather than to the caller
--
-- The current client always sends payers, so case 1 keeps today's behaviour and
-- nothing changes for new builds. This only stops old ones from rewriting
-- history. CREATE is untouched: attributing a brand-new expense with no payer
-- information to `p_paid_by` is correct there.

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
  _uid         uuid := auth.uid();
  _created_by  uuid;
  _owner_id    uuid;
  _paid_by     uuid;
  _old_payers  jsonb;
  _old_total   numeric;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not_group_member';
  end if;

  if p_split_type not in ('equal', 'manual') then
    raise exception 'invalid_split_type';
  end if;

  -- group_id in the WHERE clause is what keeps the owner branch below from
  -- reaching outside p_group_id.
  select created_by, paid_by into _created_by, _paid_by
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

  -- Captured before the delete below, because that is what "leave the payers
  -- alone" has to restore.
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'amount', amount)), '[]'::jsonb),
         coalesce(sum(amount), 0)
    into _old_payers, _old_total
  from public.expense_payers
  where expense_id = p_expense_id;

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
    -- Case 1: the client told us who paid.
    insert into public.expense_payers (expense_id, user_id, amount)
    select p_expense_id,
           (elem->>'user_id')::uuid,
           (elem->>'amount')::numeric
    from jsonb_array_elements(p_payers) as elem
    where (elem->>'amount')::numeric > 0;

  elsif jsonb_array_length(_old_payers) > 0 and _old_total > 0 then
    if abs(round(_old_total, 2) - round(p_amount, 2)) <= 0.01 then
      -- Case 2: the amount did not move, so the rows still describe the truth.
      insert into public.expense_payers (expense_id, user_id, amount)
      select p_expense_id,
             (elem->>'user_id')::uuid,
             round((elem->>'amount')::numeric, 2)
      from jsonb_array_elements(_old_payers) as elem
      where round((elem->>'amount')::numeric, 2) > 0;
    else
      -- Case 3: pro-rate to the new amount. Rows that round away to zero are
      -- dropped (the server rejects a non-positive allocation), and the leftover
      -- kurus lands on the largest remaining row so the payers still add up.
      insert into public.expense_payers (expense_id, user_id, amount)
      with scaled as (
        select (elem->>'user_id')::uuid as user_id,
               round(((elem->>'amount')::numeric / _old_total) * p_amount, 2) as amount
        from jsonb_array_elements(_old_payers) as elem
      ),
      kept as (
        select user_id, amount,
               row_number() over (order by amount desc, user_id) as rn,
               sum(amount) over () as kept_total
        from scaled
        where amount > 0
      )
      select p_expense_id,
             user_id,
             case when rn = 1 then amount + (round(p_amount, 2) - kept_total) else amount end
      from kept;
    end if;
  end if;

  -- Case 4, and the guard for a pro-rate that kept nothing: every expense must
  -- have at least one payer, attributed to paid_by rather than to the caller.
  if not exists (select 1 from public.expense_payers where expense_id = p_expense_id) then
    insert into public.expense_payers (expense_id, user_id, amount)
    values (p_expense_id, coalesce(_paid_by, _uid), p_amount);
  end if;
end;
$$;

revoke all on function public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb, jsonb) to authenticated;
