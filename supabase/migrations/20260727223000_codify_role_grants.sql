-- Codify the privileges the client role actually needs.
--
-- Until now no migration granted anything to `authenticated`. The hosted
-- database works because those grants were applied there outside version
-- control, but a database built from this migration chain alone is dead on
-- arrival: `authenticated` has no DML on any table in `public`, and
-- is_group_member / is_group_participant are revoked from `public` with no
-- matching grant, so every RLS policy that calls them raises
--   permission denied for function is_group_member
-- instead of evaluating. That breaks disaster recovery, a second environment,
-- and any local test database (confirmed by running the chain against a fresh
-- Postgres on 2026-07-27).
--
-- This migration is additive only. It cannot take away anything the hosted
-- database already has; it makes the intended access surface reproducible and
-- reviewable.
--
-- Rule used below: grant exactly the operations that have an RLS policy. RLS is
-- enabled on every table in `public`, so a grant without a policy is dead
-- weight, and a policy without a grant is a policy that never runs.
--
-- `anon` gets nothing: every screen in the app is behind auth, profile rows are
-- created by the SECURITY DEFINER signup trigger, and joining a group goes
-- through an RPC that requires a session.

grant usage on schema public to authenticated;

-- profiles — read co-members, edit yourself. (The signup trigger inserts, and
-- it is SECURITY DEFINER, but profiles_insert_self exists for the self-service
-- path so the grant matches it.)
grant select, insert, update on public.profiles to authenticated;

-- friend_requests — created through send_friend_request_by_code(), so no
-- INSERT: accept/reject is an UPDATE, withdrawing a pending one is a DELETE.
grant select, update, delete on public.friend_requests to authenticated;

-- groups — create, read, rename; deletion is a soft delete through UPDATE.
grant select, insert, update on public.groups to authenticated;

-- group_members — joining goes through join_group_by_invite() and the owner
-- trigger, so no INSERT. Leaving and role changes are UPDATEs on left_at/role.
grant select, update on public.group_members to authenticated;

-- expenses — no DELETE: removal is a soft delete through UPDATE (deleted_at),
-- and there is no DELETE policy either.
grant select, insert, update on public.expenses to authenticated;

grant select, insert, update, delete on public.expense_shares to authenticated;
grant select, insert, update, delete on public.expense_payers to authenticated;

-- settlements — recorded once and then soft-deleted; never hard-deleted.
grant select, insert, update on public.settlements to authenticated;

-- activity_log — read only, deliberately.
--
-- An activity_log_insert_active_member policy exists from the Week 3 migration,
-- but the feature is unbuilt and the design decision recorded in ROADMAP.md is
-- that entries are produced by database triggers rather than by the client, so
-- that a missed call path or an old app build cannot leave gaps in the audit
-- trail. Withholding INSERT here keeps that decision enforceable: the trigger
-- functions must be SECURITY DEFINER, which is what guarantees coverage anyway.
-- If the client ever needs to write log rows directly, granting INSERT is a
-- deliberate one-line change rather than something that was always open.
grant select on public.activity_log to authenticated;
grant select on public.activity_log_archive to authenticated;

-- Deliberately NOT granted: public.ai_usage and public.app_config. Both have
-- RLS enabled with no policies at all so they are unreachable from PostgREST
-- regardless, and only the SECURITY DEFINER consume_ai_quota() touches them.
-- Leaving them out keeps "no client access" true at the privilege layer too,
-- rather than relying on the absence of a policy.

-- The two RLS helpers. Every SELECT policy on group-scoped data calls one of
-- them, so without these the whole schema reads as empty (or errors) for the
-- client role.
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_participant(uuid) to authenticated;
