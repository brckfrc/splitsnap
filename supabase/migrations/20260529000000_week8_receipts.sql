-- SplitSnap — Week 8: Receipt Storage & OCR Infrastructure
-- Creates receipts bucket, storage RLS policies, and extends expense RPCs
-- with p_receipt_storage_path + p_ocr_suggestions parameters.
-- Depends on: 20260427000000_security_optimization.sql

-- =============================================================================
-- 1. Storage bucket (private, 5 MB per file, jpeg/png/heic)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

-- =============================================================================
-- 2. Storage RLS policies
--    Path format: receipts/{group_id}/{timestamp_uuid}.jpg
--    split_part(name, '/', 1) extracts the group_id folder.
-- =============================================================================

-- INSERT: only active group members may upload to their group's folder
create policy "receipts_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_group_member(split_part(name, '/', 1)::uuid)
  );

-- SELECT: any group participant (incl. left members) may read via signed URLs
create policy "receipts_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_group_participant(split_part(name, '/', 1)::uuid)
  );

-- =============================================================================
-- 3. Extend create_expense_with_shares
--    Old signature (9 params) → New signature (11 params, backward-compatible)
-- =============================================================================
drop function if exists public.create_expense_with_shares(
  uuid, text, text, numeric, date, uuid, text, text, jsonb
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
  p_ocr_suggestions       jsonb   default null
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

  return _expense_id;
end;
$$;

-- =============================================================================
-- 4. Extend update_expense_with_shares
--    Old signature (9 params) → New signature (11 params, backward-compatible)
--    receipt_storage_path and ocr_suggestions use COALESCE to preserve existing
--    values when the caller passes NULL (e.g. edit form without changing receipt).
-- =============================================================================
drop function if exists public.update_expense_with_shares(
  uuid, uuid, text, text, numeric, date, text, text, jsonb
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
  p_ocr_suggestions       jsonb   default null
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

  select e.created_by into _created_by
  from public.expenses e
  where e.id = p_expense_id and e.group_id = p_group_id;

  if _created_by is null then
    raise exception 'expense_not_found';
  end if;

  select g.owner_id into _owner_id
  from public.groups g
  where g.id = p_group_id;

  if _uid <> _created_by and _uid <> _owner_id then
    raise exception 'not_authorized';
  end if;

  if trim(p_title) = '' then
    raise exception 'empty_title';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  update public.expenses
  set title                = trim(p_title),
      description          = nullif(trim(p_description), ''),
      amount               = p_amount,
      expense_date         = p_expense_date,
      split_type           = p_split_type,
      icon                 = p_icon,
      -- preserve existing path/ocr when caller passes NULL (no new receipt)
      receipt_storage_path = coalesce(p_receipt_storage_path, receipt_storage_path),
      ocr_suggestions      = coalesce(p_ocr_suggestions, ocr_suggestions)
  where id = p_expense_id;

  delete from public.expense_shares
  where expense_id = p_expense_id;

  insert into public.expense_shares (expense_id, user_id, amount)
  select p_expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  from jsonb_array_elements(p_shares) as elem
  where (elem->>'amount')::numeric > 0;
end;
$$;

-- =============================================================================
-- 5. Re-grant execute on new (11-param) signatures
-- =============================================================================
revoke all on function public.create_expense_with_shares(
  uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb
) from public;

revoke all on function public.update_expense_with_shares(
  uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb
) from public;

grant execute on function public.create_expense_with_shares(
  uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb
) to authenticated;

grant execute on function public.update_expense_with_shares(
  uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb
) to authenticated;
