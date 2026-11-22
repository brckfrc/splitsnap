-- Sprint #6, second pass: make the client roles' privileges exactly the
-- codified set, and close direct writes to expense_shares / expense_payers.
--
-- Why. 20260727223000_codify_role_grants.sql was additive only, so it could not
-- take anything away from the hosted database. The 2026-11-22 production dump
-- shows what that left in place:
--   * `anon` and `authenticated` hold ALL on every table in `public`
--     (ai_usage and app_config included), and default privileges hand ALL on
--     every future table, sequence and function to both roles;
--   * so `authenticated` can INSERT into activity_log (the Week 3 policy is
--     still there), which the grants migration meant to withhold;
--   * `anon` (the public key shipped in the app) can EXECUTE every SECURITY
--     DEFINER RPC without a session: lookup_user_by_friend_code returns a
--     user's id and name for a friend code, and join_group_by_invite tells a
--     valid invite code from an invalid one.
-- RLS kept the table grants mostly unreachable (every policy is
-- `to authenticated`, there are no DELETE policies, PostgREST never issues
-- TRUNCATE), but the privilege layer should say what the app actually uses.
--
-- expense_shares / expense_payers: the creator (or group owner) could INSERT,
-- UPDATE and DELETE rows directly through PostgREST, which skips
-- validate_expense_allocations, so an expense whose shares do not add up, or
-- that allocates to someone outside the group, could be written. Balances are
-- computed from these tables. The client only ever reads them; every write goes
-- through create_/update_expense_with_shares (SECURITY DEFINER).
--
-- Client-safe: every App Store / TestFlight build (1.2.0 Build 13 →
-- 1.2.1 Build 17) uses only what is re-granted below: SELECT on group-scoped
-- tables, INSERT on groups and settlements, the expenses soft delete, and the
-- RPCs join_group_by_invite, create_/update_expense_with_shares,
-- get_emoji_usage_stats (plus consume_ai_quota via parse-receipt, which calls
-- it with the user's JWT). service_role (Edge Functions) is not touched.

-- -----------------------------------------------------------------------------
-- 1. Tables: drop everything, re-grant the codified set
-- -----------------------------------------------------------------------------
-- REVOKE ALL on a table also drops its column-level grants, so the two
-- `update (deleted_at)` grants from 20261122200000 are re-granted here.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update, delete on public.friend_requests to authenticated;
grant select, insert, update on public.groups to authenticated;
grant select, update on public.group_members to authenticated;
grant select on public.expenses to authenticated;
grant update (deleted_at) on public.expenses to authenticated;
grant select on public.expense_shares to authenticated;
grant select on public.expense_payers to authenticated;
grant select, insert on public.settlements to authenticated;
grant update (deleted_at) on public.settlements to authenticated;
grant select on public.activity_log to authenticated;
grant select on public.activity_log_archive to authenticated;
-- ai_usage, app_config: nothing (only consume_ai_quota touches them).

-- The write policies on expense_shares / expense_payers can no longer run;
-- drop them so the policy list matches the grants. (activity_log's INSERT
-- policy stays, as 20260727223000 explains: granting INSERT is meant to be a
-- deliberate one-line change if the client ever writes the log itself.)
drop policy if exists expense_shares_insert_active_member on public.expense_shares;
drop policy if exists expense_shares_update_active_member on public.expense_shares;
drop policy if exists expense_shares_delete_active_member on public.expense_shares;
drop policy if exists expense_payers_insert_active_member on public.expense_payers;
drop policy if exists expense_payers_update_active_member on public.expense_payers;
drop policy if exists expense_payers_delete_active_member on public.expense_payers;

-- -----------------------------------------------------------------------------
-- 2. Functions: no session, no RPC
-- -----------------------------------------------------------------------------
-- Every screen is behind auth, so `anon` needs no function at all. Trigger and
-- event-trigger functions are not affected: EXECUTE is not checked when a
-- trigger fires. PUBLIC is revoked too, because a PUBLIC grant would hand
-- `anon` the same access.
revoke execute on all functions in schema public from public, anon;

-- `authenticated` keeps exactly the functions it calls (RLS helpers + RPCs).
-- These grants already exist; restating them keeps this file the full answer.
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_participant(uuid) to authenticated;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.lookup_user_by_friend_code(text) to authenticated;
grant execute on function public.send_friend_request_by_code(text) to authenticated;
grant execute on function public.consume_ai_quota() to authenticated;
grant execute on function public.get_emoji_usage_stats() to authenticated;
grant execute on function public.create_expense_with_shares(
  uuid, text, text, numeric, date, uuid, text, text, jsonb, text, jsonb, jsonb
) to authenticated;
grant execute on function public.update_expense_with_shares(
  uuid, uuid, text, text, numeric, date, text, text, jsonb, text, jsonb, jsonb
) to authenticated;

-- Internal helpers the client must not call directly. On production they were
-- reachable through the default privileges above.
revoke execute on function public.generate_global_unique_code() from authenticated;
revoke execute on function public.validate_expense_allocations(uuid, jsonb, numeric, text) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.set_updated_at() from authenticated;
revoke execute on function public.trg_add_owner_as_group_member() from authenticated;
revoke execute on function public.trg_generate_group_invite_code() from authenticated;

-- -----------------------------------------------------------------------------
-- 3. Future objects: nothing by default
-- -----------------------------------------------------------------------------
-- Objects later migrations create (as `postgres`) start with no access for the
-- client roles, which is already the rule in docs/DATABASE.md §5.5.2: a
-- migration that creates a table grants what its policies allow, in the same
-- file. service_role keeps its defaults (20261103120000).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- EXECUTE for PUBLIC is Postgres's built-in global default and cannot be
-- revoked per schema; revoking it globally would also hit every function
-- postgres creates anywhere (the SQL suites' pg_temp helpers broke at once).
-- So the existing rule stays: a migration that creates a function revokes it
-- from public itself. supabase/tests/role_grants_test.sql fails if one forgets
-- ("anon can execute no public function").
