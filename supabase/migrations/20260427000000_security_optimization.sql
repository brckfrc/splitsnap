-- SplitSnap — Security & Optimization Migration
-- Fixes: BUG-01 (atomic update), BUG-02 (atomic create), SEC-01 (expense_shares RLS),
--        SEC-05 (soft-deleted groups filter)
-- Depends on: 20260412140000_week4_expenses.sql

-- =============================================================================
-- 1. Atomic RPC: create_expense_with_shares
--    Replaces client-side INSERT expense + INSERT shares (non-atomic).
--    Single transaction guarantees no orphan expenses or lost shares.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_expense_with_shares(
  p_group_id    uuid,
  p_title       text,
  p_description text    DEFAULT NULL,
  p_amount      numeric DEFAULT 0,
  p_expense_date date   DEFAULT CURRENT_DATE,
  p_paid_by     uuid    DEFAULT NULL,
  p_split_type  text    DEFAULT 'equal',
  p_icon        text    DEFAULT NULL,
  p_shares      jsonb   DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _expense_id uuid;
BEGIN
  -- Auth guard: caller must be active group member
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'not_group_member';
  END IF;

  -- Validate inputs
  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'empty_title';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_split_type NOT IN ('equal', 'manual') THEN
    RAISE EXCEPTION 'invalid_split_type';
  END IF;

  -- Insert expense (created_by = caller)
  INSERT INTO public.expenses (
    group_id, title, description, amount, expense_date,
    paid_by, created_by, split_type, icon,
    receipt_storage_path, ocr_suggestions
  )
  VALUES (
    p_group_id, trim(p_title), nullif(trim(p_description), ''),
    p_amount, p_expense_date,
    COALESCE(p_paid_by, _uid), _uid, p_split_type, p_icon,
    NULL, NULL
  )
  RETURNING id INTO _expense_id;

  -- Insert shares from JSONB array: [{"user_id":"...","amount":0}, ...]
  INSERT INTO public.expense_shares (expense_id, user_id, amount)
  SELECT _expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  FROM jsonb_array_elements(p_shares) AS elem
  WHERE (elem->>'amount')::numeric > 0;

  RETURN _expense_id;
END;
$$;

-- =============================================================================
-- 2. Atomic RPC: update_expense_with_shares
--    Replaces client-side UPDATE expense + DELETE shares + INSERT shares (non-atomic).
--    Guarantees shares are never lost during concurrent edits.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_expense_with_shares(
  p_expense_id  uuid,
  p_group_id    uuid,
  p_title       text,
  p_description text    DEFAULT NULL,
  p_amount      numeric DEFAULT 0,
  p_expense_date date   DEFAULT CURRENT_DATE,
  p_split_type  text    DEFAULT 'equal',
  p_icon        text    DEFAULT NULL,
  p_shares      jsonb   DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _created_by uuid;
  _owner_id   uuid;
BEGIN
  -- Auth guard: caller must be active group member
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'not_group_member';
  END IF;

  -- Fetch expense creator for authorization
  SELECT e.created_by INTO _created_by
  FROM public.expenses e
  WHERE e.id = p_expense_id AND e.group_id = p_group_id;

  IF _created_by IS NULL THEN
    RAISE EXCEPTION 'expense_not_found';
  END IF;

  -- Fetch group owner
  SELECT g.owner_id INTO _owner_id
  FROM public.groups g
  WHERE g.id = p_group_id;

  -- Only expense creator or group owner can update
  IF _uid <> _created_by AND _uid <> _owner_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Validate inputs
  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'empty_title';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Update expense
  UPDATE public.expenses
  SET title       = trim(p_title),
      description = nullif(trim(p_description), ''),
      amount      = p_amount,
      expense_date = p_expense_date,
      split_type  = p_split_type,
      icon        = p_icon
  WHERE id = p_expense_id;

  -- Replace shares atomically: delete old, insert new
  DELETE FROM public.expense_shares
  WHERE expense_id = p_expense_id;

  INSERT INTO public.expense_shares (expense_id, user_id, amount)
  SELECT p_expense_id,
         (elem->>'user_id')::uuid,
         (elem->>'amount')::numeric
  FROM jsonb_array_elements(p_shares) AS elem
  WHERE (elem->>'amount')::numeric > 0;
END;
$$;

-- =============================================================================
-- 3. Grants for new RPCs
-- =============================================================================
REVOKE ALL ON FUNCTION public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb) FROM public;

GRANT EXECUTE ON FUNCTION public.create_expense_with_shares(uuid, text, text, numeric, date, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_expense_with_shares(uuid, uuid, text, text, numeric, date, text, text, jsonb) TO authenticated;

-- =============================================================================
-- 4. SEC-01: Tighten expense_shares RLS policies
--    Add created_by / group-owner check so a group member cannot
--    manipulate shares on someone else's expense via direct API access.
-- =============================================================================
DROP POLICY IF EXISTS expense_shares_insert_active_member ON public.expense_shares;
DROP POLICY IF EXISTS expense_shares_update_active_member ON public.expense_shares;
DROP POLICY IF EXISTS expense_shares_delete_active_member ON public.expense_shares;

-- INSERT: caller must be active member AND (expense creator OR group owner)
CREATE POLICY expense_shares_insert_active_member
  ON public.expense_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expenses e
        JOIN public.groups g ON g.id = e.group_id
      WHERE e.id = expense_shares.expense_id
        AND public.is_group_member(e.group_id)
        AND (
          e.created_by = (SELECT auth.uid())
          OR g.owner_id = (SELECT auth.uid())
        )
    )
  );

-- UPDATE: same authorization
CREATE POLICY expense_shares_update_active_member
  ON public.expense_shares
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
        JOIN public.groups g ON g.id = e.group_id
      WHERE e.id = expense_shares.expense_id
        AND public.is_group_member(e.group_id)
        AND (
          e.created_by = (SELECT auth.uid())
          OR g.owner_id = (SELECT auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expenses e
        JOIN public.groups g ON g.id = e.group_id
      WHERE e.id = expense_shares.expense_id
        AND public.is_group_member(e.group_id)
        AND (
          e.created_by = (SELECT auth.uid())
          OR g.owner_id = (SELECT auth.uid())
        )
    )
  );

-- DELETE: same authorization
CREATE POLICY expense_shares_delete_active_member
  ON public.expense_shares
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
        JOIN public.groups g ON g.id = e.group_id
      WHERE e.id = expense_shares.expense_id
        AND public.is_group_member(e.group_id)
        AND (
          e.created_by = (SELECT auth.uid())
          OR g.owner_id = (SELECT auth.uid())
        )
    )
  );

-- =============================================================================
-- 5. SEC-05: Filter soft-deleted groups from SELECT policy
-- =============================================================================
DROP POLICY IF EXISTS groups_select_participant ON public.groups;

CREATE POLICY groups_select_participant
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      owner_id = (SELECT auth.uid())
      OR public.is_group_participant(id)
    )
  );
