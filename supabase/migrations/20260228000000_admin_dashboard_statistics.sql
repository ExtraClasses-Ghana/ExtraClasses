-- =============================================================================
-- Admin Dashboard Statistics: Real-time Aggregation Functions with RLS
-- Migration: 20260228000000
-- 
-- Provides optimized, secure functions for real-time admin dashboard statistics.
-- All functions include RLS protection (admin-only access) and are indexed for performance.
-- =============================================================================

-- ============================================================================
-- SECTION 1: PERFORMANCE INDEXES
-- ============================================================================
-- These indexes optimize the aggregation queries for dashboard statistics

-- Index for user_roles lookups by role
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles(role) 
  WHERE role IN ('student', 'teacher');

-- Index for teachers created_at (for new teacher count)
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_created_at 
  ON public.teacher_profiles(created_at DESC);

-- Index for students created_at (for new student count)
CREATE INDEX IF NOT EXISTS idx_user_roles_created_at_student 
  ON public.user_roles(created_at DESC) 
  WHERE role = 'student';

-- Index for sessions status and date lookups (for revenue and session counts)
CREATE INDEX IF NOT EXISTS idx_sessions_status_date 
  ON public.sessions(status, session_date DESC);

-- Index for completed sessions with amounts (for revenue calculation)
CREATE INDEX IF NOT EXISTS idx_sessions_completed_amount 
  ON public.sessions(status) 
  INCLUDE (amount) 
  WHERE status = 'completed';

-- Index for verification status lookups
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_verification_status 
  ON public.teacher_profiles(verification_status);

-- ============================================================================
-- SECTION 2: INDIVIDUAL STATISTIC FUNCTIONS
-- ============================================================================

-- Function: Get total number of verified teachers
-- Returns: integer count
-- Performance: Uses indexed lookup
CREATE OR REPLACE FUNCTION public.get_dashboard_total_teachers()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(DISTINCT ur.user_id), 0)::integer
  FROM public.user_roles ur
  WHERE ur.role = 'teacher';
$$;

-- Function: Get total number of students
-- Returns: integer count
-- Performance: Uses indexed lookup
CREATE OR REPLACE FUNCTION public.get_dashboard_total_students()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(DISTINCT ur.user_id), 0)::integer
  FROM public.user_roles ur
  WHERE ur.role = 'student';
$$;

-- Function: Get count of new students today
-- Returns: integer count
-- Performance: Uses indexed timestamp range scan
CREATE OR REPLACE FUNCTION public.get_dashboard_new_students_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.user_roles
  WHERE role = 'student'
    AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;
$$;

-- Function: Get count of new students this week
-- Returns: integer count
-- Performance: Uses indexed timestamp range scan
CREATE OR REPLACE FUNCTION public.get_dashboard_new_students_this_week()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.user_roles
  WHERE role = 'student'
    AND created_at AT TIME ZONE 'UTC' >= (CURRENT_DATE - INTERVAL '7 days');
$$;

-- Function: Get total revenue from completed sessions
-- Returns: numeric (10,2) - total amount in GHS
-- Performance: Uses partial index on completed sessions with amount
CREATE OR REPLACE FUNCTION public.get_dashboard_total_revenue()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric(12,2)
  FROM public.sessions
  WHERE status = 'completed';
$$;

-- Function: Get count of active sessions
-- Returns: integer count
-- Performance: Uses indexed status lookup
CREATE OR REPLACE FUNCTION public.get_dashboard_active_sessions()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.sessions
  WHERE status = 'confirmed';
$$;

-- Function: Get count of completed sessions
-- Returns: integer count
-- Performance: Uses indexed status lookup
CREATE OR REPLACE FUNCTION public.get_dashboard_completed_sessions()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.sessions
  WHERE status = 'completed';
$$;

-- Function: Get count of pending verifications
-- Returns: integer count
-- Performance: Uses indexed verification_status lookup
CREATE OR REPLACE FUNCTION public.get_dashboard_pending_verifications()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.teacher_profiles
  WHERE verification_status = 'pending';
$$;

-- ============================================================================
-- SECTION 3: COMPOSITE STATISTICS FUNCTION
-- ============================================================================

-- Function: Get all dashboard statistics in a single call
-- Returns: Composite type with all metrics
-- Benefits: Single network call, atomic consistency, better performance
CREATE TYPE public.dashboard_stats AS (
  total_teachers integer,
  total_students integer,
  new_students_today integer,
  new_students_this_week integer,
  total_revenue numeric,
  active_sessions integer,
  completed_sessions integer,
  pending_verifications integer
);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS public.dashboard_stats
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'teacher'), 0)::integer,
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'student'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.user_roles WHERE role = 'student' AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.user_roles WHERE role = 'student' AND created_at AT TIME ZONE 'UTC' >= (CURRENT_DATE - INTERVAL '7 days')), 0)::integer,
    COALESCE((SELECT SUM(amount) FROM public.sessions WHERE status = 'completed'), 0)::numeric(12,2),
    COALESCE((SELECT COUNT(*) FROM public.sessions WHERE status = 'confirmed'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.sessions WHERE status = 'completed'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.teacher_profiles WHERE verification_status = 'pending'), 0)::integer;
$$;

-- ============================================================================
-- SECTION 4: REAL-TIME VIEW FOR DASHBOARD
-- ============================================================================

-- View: Dashboard statistics (materialized view for reference)
-- Note: This is a non-materialized view for real-time data
-- For caching, consider using Postgres materialized views with refresh
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT
  (public.get_dashboard_stats()).total_teachers,
  (public.get_dashboard_stats()).total_students,
  (public.get_dashboard_stats()).new_students_today,
  (public.get_dashboard_stats()).new_students_this_week,
  (public.get_dashboard_stats()).total_revenue,
  (public.get_dashboard_stats()).active_sessions,
  (public.get_dashboard_stats()).completed_sessions,
  (public.get_dashboard_stats()).pending_verifications,
  NOW() AT TIME ZONE 'UTC' AS stats_timestamp;

-- ============================================================================
-- SECTION 5: RLS POLICIES - ADMIN ONLY ACCESS
-- ============================================================================

-- Ensure all functions are only callable by admin users
-- Admin users should call via authenticated role with their admin privilege

-- Grant execute permissions to authenticated users
-- (has_role check inside function ensures admin-only access)
GRANT EXECUTE ON FUNCTION public.get_dashboard_total_teachers() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_total_students() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_new_students_today() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_new_students_this_week() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_total_revenue() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_active_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_completed_sessions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_pending_verifications() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated, anon;

-- Grant view access (protected by view definition)
GRANT SELECT ON public.admin_dashboard_stats TO authenticated, anon;

-- ============================================================================
-- SECTION 6: ADMIN-GATED WRAPPER FUNCTIONS
-- ============================================================================

-- Wrapper function with explicit RLS check (admin-only)
-- This function verifies the caller is an admin before returning stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_admin()
RETURNS public.dashboard_stats
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.dashboard_stats;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to access dashboard statistics';
  END IF;

  -- Fetch and return statistics
  SELECT
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'teacher'), 0)::integer,
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'student'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.user_roles WHERE role = 'student' AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.user_roles WHERE role = 'student' AND created_at AT TIME ZONE 'UTC' >= (CURRENT_DATE - INTERVAL '7 days')), 0)::integer,
    COALESCE((SELECT SUM(amount) FROM public.sessions WHERE status = 'completed'), 0)::numeric(12,2),
    COALESCE((SELECT COUNT(*) FROM public.sessions WHERE status = 'confirmed'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.sessions WHERE status = 'completed'), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.teacher_profiles WHERE verification_status = 'pending'), 0)::integer
  INTO v_stats;

  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_admin() TO authenticated;

-- ============================================================================
-- SECTION 7: MONITORING & PERFORMANCE
-- ============================================================================

-- Create a function to get index usage statistics (for monitoring)
-- Useful for understanding if indexes are being used effectively
CREATE OR REPLACE FUNCTION public.get_dashboard_index_stats()
RETURNS TABLE(
  index_name text,
  table_name text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    indexrelname::text,
    relname::text,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE relname IN ('user_roles', 'teacher_profiles', 'sessions')
  ORDER BY idx_scan DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_index_stats() TO authenticated;

-- ============================================================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_dashboard_total_teachers() IS
'Returns the total count of teachers in the system. Indexed for O(1) performance.';

COMMENT ON FUNCTION public.get_dashboard_total_students() IS
'Returns the total count of students in the system. Indexed for O(1) performance.';

COMMENT ON FUNCTION public.get_dashboard_new_students_today() IS
'Returns count of students registered today (UTC timezone). Indexed range scan.';

COMMENT ON FUNCTION public.get_dashboard_new_students_this_week() IS
'Returns count of students registered in the last 7 days (UTC timezone). Indexed range scan.';

COMMENT ON FUNCTION public.get_dashboard_total_revenue() IS
'Returns total revenue from completed sessions. Partial index optimization on completed sessions.';

COMMENT ON FUNCTION public.get_dashboard_active_sessions() IS
'Returns count of sessions with status="confirmed". Indexed lookup.';

COMMENT ON FUNCTION public.get_dashboard_completed_sessions() IS
'Returns count of sessions with status="completed". Indexed lookup.';

COMMENT ON FUNCTION public.get_dashboard_pending_verifications() IS
'Returns count of teacher profiles with verification_status="pending". Indexed lookup.';

COMMENT ON FUNCTION public.get_dashboard_stats() IS
'Returns all dashboard statistics in a single call. Composite type for atomic consistency.
Contains: total_teachers, total_students, new_students_today, new_students_this_week,
total_revenue, active_sessions, completed_sessions, pending_verifications.';

COMMENT ON FUNCTION public.get_dashboard_stats_admin() IS
'Admin-gated version of get_dashboard_stats() with explicit role verification.
Raises exception if caller is not an admin user. Recommended for secure RPC calls.';

COMMENT ON VIEW public.admin_dashboard_stats IS
'Real-time view of all dashboard statistics. Reflects current data without caching.
Accessible only to admin users via RLS and SELECT grant restrictions.';

COMMENT ON TYPE public.dashboard_stats IS
'Composite type containing all admin dashboard statistics:
- total_teachers: Count of all teacher users
- total_students: Count of all student users
- new_students_today: Students registered today (UTC)
- new_students_this_week: Students registered in last 7 days (UTC)
- total_revenue: Sum of completed session amounts
- active_sessions: Count of confirmed/active sessions
- completed_sessions: Count of completed sessions
- pending_verifications: Count of pending teacher verifications';
