-- AgriTrust notification read-state migration
--
-- Alert content remains protected by the existing RLS policies on public.batches,
-- public.credentials, and public.users. The two SECURITY DEFINER functions below
-- expose only the signed-in user's notification timestamp. They do not grant
-- general SELECT or UPDATE access to public.users.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_viewed_alerts_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.last_viewed_alerts_at IS
  'Timestamp when this user last opened or marked the alert feed as viewed';

CREATE OR REPLACE FUNCTION public.get_my_last_viewed_alerts_at()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT users.last_viewed_alerts_at
  FROM public.users
  WHERE users.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.mark_my_alerts_viewed(
  p_viewed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_saved_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET last_viewed_alerts_at = p_viewed_at
  WHERE id = v_user_id
  RETURNING last_viewed_alerts_at INTO v_saved_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No public.users profile exists for the signed-in user'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_saved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_last_viewed_alerts_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_last_viewed_alerts_at() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_last_viewed_alerts_at() TO authenticated;

REVOKE ALL ON FUNCTION public.mark_my_alerts_viewed(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_my_alerts_viewed(TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_my_alerts_viewed(TIMESTAMPTZ) TO authenticated;

COMMIT;

-- Run these read-only audit queries in the Supabase SQL editor after migration.
-- They verify the tables/columns, both credentials-to-users foreign keys, and
-- every RLS policy involved in alert loading. Review policy USING expressions
-- against these required permissions:
--   FARMER: SELECT only own batches for farmer-specific alerts.
--   INSPECTOR: SELECT REGISTERED batches required for inspection work.
--   DISTRIBUTOR: SELECT INSPECTED batches required for handoff.
--   REGULATOR: SELECT relevant batches, pending credentials, and applicant users.
-- No alert operation requires INSERT, DELETE, or a general users-table UPDATE.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'batches', 'credentials')
  AND column_name IN (
    'id', 'full_name', 'email', 'role', 'last_viewed_alerts_at',
    'batch_id', 'crop_type', 'quantity_kg', 'gmo_status', 'status',
    'registered_at', 'registered_by',
    'user_id', 'license_number', 'certifying_body', 'submitted_at'
  )
ORDER BY table_name, ordinal_position;

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'credentials'
  AND kcu.column_name IN ('user_id', 'reviewed_by');

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'batches', 'credentials')
ORDER BY tablename, cmd, policyname;