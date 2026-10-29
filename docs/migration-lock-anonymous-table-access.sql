-- AgriTrust anonymous-access hardening
--
-- Purpose: public verification is rendered by the server with an intentionally
-- limited column projection. Browser clients do not require direct anonymous
-- access to application tables. This migration removes those table privileges
-- without changing authenticated-role grants or RLS policies.
--
-- IMPORTANT: this migration has not been applied by the Codex implementation
-- session because only REST service-role credentials were available, not a
-- database-owner connection. Apply in the Supabase SQL editor, then run the
-- verification queries at the bottom and the read-only security audit script.
-- Deploy the server-rendered public verification implementation before applying
-- this migration; the older deployment reads these tables with the anon role.

BEGIN;

-- Revoke both direct anon grants and grants inherited by every database role
-- through PostgreSQL's PUBLIC pseudo-role. Authenticated and service_role grants
-- are intentionally left unchanged.
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.batches FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.farms FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.inspections FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.handoffs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.credentials FROM PUBLIC, anon;

COMMIT;

-- Expected: all privilege flags are false for the anon role. Also inspect RLS
-- separately: table grants and row policies are independent authorization layers.
SELECT
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') AS can_select,
  has_table_privilege('anon', format('public.%I', table_name), 'INSERT') AS can_insert,
  has_table_privilege('anon', format('public.%I', table_name), 'UPDATE') AS can_update,
  has_table_privilege('anon', format('public.%I', table_name), 'DELETE') AS can_delete
FROM (VALUES
  ('users'),
  ('batches'),
  ('farms'),
  ('inspections'),
  ('handoffs'),
  ('credentials')
) AS protected_tables(table_name)
ORDER BY table_name;

-- These are read-only audit queries. Review their output before and after the
-- migration. This migration deliberately does not replace deployed authenticated
-- policies because doing so without first reviewing their exact USING/WITH CHECK
-- expressions could either break a role workflow or broaden access.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'batches', 'farms', 'inspections', 'handoffs', 'credentials')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'batches', 'farms', 'inspections', 'handoffs', 'credentials')
ORDER BY tablename, cmd, policyname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('users', 'batches', 'farms', 'inspections', 'handoffs', 'credentials')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
