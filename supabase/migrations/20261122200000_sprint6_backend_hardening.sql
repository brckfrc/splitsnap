-- Sprint #6 backend hardening: freeze settlements and expenses against direct
-- rewrites, reject self-payments, and lock down get_emoji_usage_stats.
--
-- Client-safe by construction. Every client build on the App Store or in
-- TestFlight (1.2.0 Build 13 through 1.2.1 Build 17) touches these tables only
-- like this:
--   * expenses    — created and edited through create_/update_expense_with_shares
--                   (SECURITY DEFINER, so these grants do not apply to them);
--                   the client itself only soft-deletes (UPDATE deleted_at).
--   * settlements — the client INSERTs a payment between itself and another
--                   group participant and never UPDATEs one.
-- So the only direct UPDATE either table still needs is on `deleted_at`.

-- -----------------------------------------------------------------------------
-- 1. settlements: immutable except for the soft delete
-- -----------------------------------------------------------------------------
-- RLS cannot compare OLD and NEW, so the soft-delete UPDATE policy let either
-- party rewrite amount / from_user_id / to_user_id. A column-level grant is the
-- simplest freeze: an UPDATE of any other column fails with "permission denied".
revoke update on public.settlements from authenticated;
grant update (deleted_at) on public.settlements to authenticated;

-- A payment from someone to themself is meaningless and would only confuse the
-- balance view. friend_requests has the same kind of check.
alter table public.settlements
  add constraint settlements_distinct_users check (from_user_id <> to_user_id);

-- The INSERT policy checked that the caller is an active member and one of the
-- two parties, but not that the other party belongs to the group at all, so a
-- member could book a payment to any profile id. The counterparty must be a
-- group participant; a former member (left_at set) still qualifies, because
-- settling up with someone who already left is a normal flow.
drop policy if exists settlements_insert_involved_member on public.settlements;
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
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = settlements.group_id
        and gm.user_id = case
          when settlements.from_user_id = (select auth.uid()) then settlements.to_user_id
          else settlements.from_user_id
        end
    )
  );

-- -----------------------------------------------------------------------------
-- 2. expenses: creation is RPC-only, direct UPDATE is the soft delete only
-- -----------------------------------------------------------------------------
-- The direct INSERT policy never constrained paid_by, and the UPDATE policy
-- pinned neither paid_by, created_by nor group_id. The RPCs validate all of
-- that, so the direct paths are closed rather than patched.
revoke insert, update on public.expenses from authenticated;
grant update (deleted_at) on public.expenses to authenticated;

-- With INSERT revoked the policy can never run; drop it so the policy list
-- matches the grants (codify_role_grants rule: a grant per policy, a policy
-- per grant).
drop policy if exists expenses_insert_active_member on public.expenses;

-- -----------------------------------------------------------------------------
-- 3. get_emoji_usage_stats: same lockdown as every other function
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER, so RLS already limits it to expenses the caller can see;
-- this pins search_path and takes it away from PUBLIC / anon.
alter function public.get_emoji_usage_stats() set search_path = public;
revoke execute on function public.get_emoji_usage_stats() from public, anon;
grant execute on function public.get_emoji_usage_stats() to authenticated;
