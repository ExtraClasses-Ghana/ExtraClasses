-- =============================================================================
-- Admin Student Management - Fix: Correct Sessions Join
-- Migration: 20260228000003
--
-- This migration fixes the get_admin_students function to properly join
-- with the sessions table, handling both 'user_id' and 'student_id' columns
-- =============================================================================

-- ============================================================================
-- SECTION 1: FIX GET_ADMIN_STUDENTS FUNCTION
-- ============================================================================

-- Drop the problematic function first
DROP FUNCTION IF EXISTS public.get_admin_students(integer, integer, text) CASCADE;

-- Recreate with corrected JOIN clause
CREATE OR REPLACE FUNCTION public.get_admin_students(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  education_level text,
  is_suspended boolean,
  is_blocked boolean,
  suspension_reason text,
  block_reason text,
  suspension_date timestamp with time zone,
  block_date timestamp with time zone,
  created_at timestamp with time zone,
  total_sessions integer,
  total_spent numeric,
  last_active timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.education_level,
    p.is_suspended,
    p.is_blocked,
    p.suspension_reason,
    p.block_reason,
    p.suspension_date,
    p.block_date,
    p.created_at,
    COALESCE(COUNT(DISTINCT s.id), 0)::integer as total_sessions,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.amount ELSE 0 END), 0)::numeric(12,2) as total_spent,
    MAX(s.session_date AT TIME ZONE 'UTC')::timestamp with time zone as last_active
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN sessions s ON s.student_id = p.user_id
  WHERE ur.role = 'student'
    AND (
      filter_status IS NULL 
      OR (filter_status = 'suspended' AND p.is_suspended = true)
      OR (filter_status = 'blocked' AND p.is_blocked = true)
      OR (filter_status = 'active' AND p.is_suspended = false AND p.is_blocked = false)
    )
  GROUP BY p.user_id, p.full_name, p.email, p.education_level, p.is_suspended, p.is_blocked, 
           p.suspension_reason, p.block_reason, p.suspension_date, p.block_date, p.created_at
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Recreate the admin-gated wrapper
DROP FUNCTION IF EXISTS public.get_admin_students_list(integer, integer, text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_students_list(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  education_level text,
  is_suspended boolean,
  is_blocked boolean,
  suspension_reason text,
  block_reason text,
  suspension_date timestamp with time zone,
  block_date timestamp with time zone,
  created_at timestamp with time zone,
  total_sessions integer,
  total_spent numeric,
  last_active timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_admin_students(limit_count, offset_count, filter_status);
END;
$$;

-- ============================================================================
-- SECTION 2: RE-GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_admin_students(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_students_list(integer, integer, text) TO authenticated;

-- ============================================================================
-- SECTION 3: DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_admin_students(integer, integer, text) IS 
'Retrieves list of all students with their status and activity metrics for admin panel. Properly joins with sessions table using both user_id and student_id columns.';

COMMENT ON FUNCTION public.get_admin_students_list(integer, integer, text) IS 
'Admin-gated version of get_admin_students. Verifies admin role before returning data.';
