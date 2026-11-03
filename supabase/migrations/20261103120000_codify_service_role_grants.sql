-- Codify the privileges `service_role` needs, so the migration chain alone produces a database the
-- Edge Functions can use.
--
-- Supabase announced that from 2026-10-30 tables created in `public` are no longer exposed to the
-- Data API automatically: the old default privileges granted anon/authenticated/service_role full
-- DML on every new table, the new default grants nothing (changelog
-- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
-- Existing tables keep the grants they were created with, so production is unaffected today — but
-- any database rebuilt from these migrations (a local `supabase db reset` with
-- `api.auto_expose_new_tables = false`, a new hosted project) gets:
--
--   * authenticated: exactly what 20260727223000_codify_role_grants.sql grants — correct.
--   * anon: nothing — correct, that migration withholds it on purpose.
--   * service_role: nothing at all. `delete-account` then fails its profile UPDATE through
--     PostgREST with 42501 "permission denied for table profiles" (reproduced locally on
--     2026-11-03, HTTP 403), and the planned deleted-account write-off (Sprint #10), which records
--     settlements as service_role, would fail the same way.
--
-- service_role is the server-side key: it already bypasses RLS, and anything holding it is trusted
-- with the whole database. Narrowing it to the one table delete-account touches today buys no
-- security and guarantees the next Edge Function breaks, so it gets the same broad access the old
-- default gave it.
--
-- On production this is a no-op: those grants already exist through the old default privileges.
--
-- The default-privileges block covers objects created by future migrations (which run as
-- `postgres`), so a forgotten service_role GRANT can't break an Edge Function. It deliberately
-- does NOT extend to anon or authenticated: those must keep getting explicit, per-table grants that
-- match their RLS policies (rule in docs/AGENTS.md).

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
