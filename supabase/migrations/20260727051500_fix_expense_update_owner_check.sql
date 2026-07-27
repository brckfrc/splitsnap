-- Harcama düzenlemeyi tamamen kıran uuid cast hatasını giderir.
--
-- 20260726172500_split_payer.sql içindeki yetki kontrolü şöyleydi:
--
--   if _created_by <> _uid and coalesce(_owner_id, '') <> _uid then
--
-- `_owner_id` bir uuid olduğu için COALESCE'in ortak tipi uuid'ye çözülüyor ve
-- boş string sabiti uuid'ye dönüştürülmeye çalışılıyor. Bu dönüşüm planlama
-- anında yapıldığından, değerlerden bağımsız olarak her çağrıda
-- "invalid input syntax for type uuid" hatası veriyordu. Yani
-- update_expense_with_shares hiçbir zaman çalışmıyordu; uygulamada "Kaydet"
-- her harcama düzenlemesinde hata döndürüyordu.
--
-- IS DISTINCT FROM null'ı doğru ele aldığı için COALESCE'e gerek yok: sahibi
-- olmayan (teorik) bir grupta _owner_id null kalır ve kontrol yine reddeder.
--
-- Fonksiyonun geri kalanı 20260726172500 ile birebir aynıdır.

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

  if _created_by is distinct from _uid and _owner_id is distinct from _uid then
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
