-- =============================================================================
-- Admin Student Management: Real-time Functionality
-- Migration: 20260228000002
--
-- Provides admin functionality for managing student accounts including:
-- - Suspend/Block/Delete operations
-- - Real-time status updates
-- - Comprehensive audit logging
-- - Messaging system integration
-- =============================================================================

-- ============================================================================
-- SECTION 1: AUDIT LOG TABLE FOR ADMIN ACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('suspend', 'block', 'delete', 'unsuspend', 'unblock', 'message', 'verify', 'unverify')),
  action_status text NOT NULL CHECK (action_status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON public.admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_user_id ON public.admin_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON public.admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);

-- ============================================================================
-- SECTION 2: USER STATUS MANAGEMENT COLUMNS
-- ============================================================================

-- Add columns to profiles table for admin actions (if they don't exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_date timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_date timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_admin_action timestamp with time zone;

-- Indexes for status columns
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_suspension_date ON public.profiles(suspension_date DESC);

-- ============================================================================
-- SECTION 3: SUSPEND/BLOCK/DELETE FUNCTIONS
-- ============================================================================

-- Function: Suspend a student account
CREATE OR REPLACE FUNCTION public.suspend_student(
  target_user_id uuid,
  suspension_reason text DEFAULT 'No reason provided'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Verify target is a student
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = target_user_id AND role = 'student') THEN
    RAISE EXCEPTION 'Target user is not a student';
  END IF;

  -- Update student profile
  UPDATE profiles
  SET 
    is_suspended = true,
    suspension_reason = suspension_reason,
    suspension_date = CURRENT_TIMESTAMP,
    last_admin_action = CURRENT_TIMESTAMP
  WHERE user_id = target_user_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_id, target_user_id, action_type, reason, details)
  VALUES (auth.uid(), target_user_id, 'suspend', suspension_reason, jsonb_build_object(
    'suspension_reason', suspension_reason,
    'suspended_at', CURRENT_TIMESTAMP
  ));

  -- Disable user's auth session if active
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{status}', '"suspended"'::jsonb)
  WHERE id = target_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Student suspended successfully',
    'user_id', target_user_id,
    'suspended_at', CURRENT_TIMESTAMP
  );

  RETURN v_result;
END;
$$;

-- Function: Block a student account
CREATE OR REPLACE FUNCTION public.block_student(
  target_user_id uuid,
  block_reason text DEFAULT 'No reason provided'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Verify target is a student
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = target_user_id AND role = 'student') THEN
    RAISE EXCEPTION 'Target user is not a student';
  END IF;

  -- Update student profile
  UPDATE profiles
  SET 
    is_blocked = true,
    block_reason = block_reason,
    block_date = CURRENT_TIMESTAMP,
    last_admin_action = CURRENT_TIMESTAMP
  WHERE user_id = target_user_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_id, target_user_id, action_type, reason, details)
  VALUES (auth.uid(), target_user_id, 'block', block_reason, jsonb_build_object(
    'block_reason', block_reason,
    'blocked_at', CURRENT_TIMESTAMP
  ));

  -- Update auth user meta data
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{status}', '"blocked"'::jsonb)
  WHERE id = target_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Student blocked successfully',
    'user_id', target_user_id,
    'blocked_at', CURRENT_TIMESTAMP
  );

  RETURN v_result;
END;
$$;

-- Function: Unsuspend a student account
CREATE OR REPLACE FUNCTION public.unsuspend_student(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Update student profile
  UPDATE profiles
  SET 
    is_suspended = false,
    suspension_reason = NULL,
    suspension_date = NULL,
    last_admin_action = CURRENT_TIMESTAMP
  WHERE user_id = target_user_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_id, target_user_id, action_type, reason)
  VALUES (auth.uid(), target_user_id, 'unsuspend', 'Account reinstated');

  -- Update auth user meta data
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{status}', '"active"'::jsonb)
  WHERE id = target_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Student unsuspended successfully',
    'user_id', target_user_id
  );

  RETURN v_result;
END;
$$;

-- Function: Unblock a student account
CREATE OR REPLACE FUNCTION public.unblock_student(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Update student profile
  UPDATE profiles
  SET 
    is_blocked = false,
    block_reason = NULL,
    block_date = NULL,
    last_admin_action = CURRENT_TIMESTAMP
  WHERE user_id = target_user_id;

  -- Log admin action
  INSERT INTO admin_action_logs (admin_id, target_user_id, action_type, reason)
  VALUES (auth.uid(), target_user_id, 'unblock', 'Account unblocked');

  -- Update auth user meta data
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{status}', '"active"'::jsonb)
  WHERE id = target_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Student unblocked successfully',
    'user_id', target_user_id
  );

  RETURN v_result;
END;
$$;

-- Function: Delete student account
CREATE OR REPLACE FUNCTION public.delete_student_account(
  target_user_id uuid,
  reason text DEFAULT 'Account deletion requested'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Verify target is a student
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = target_user_id AND role = 'student') THEN
    RAISE EXCEPTION 'Target user is not a student';
  END IF;

  -- Log admin action before deletion
  INSERT INTO admin_action_logs (admin_id, target_user_id, action_type, reason, details)
  VALUES (auth.uid(), target_user_id, 'delete', reason, jsonb_build_object(
    'deletion_reason', reason,
    'deleted_at', CURRENT_TIMESTAMP
  ));

  -- Mark profile as deleted instead of hard delete
  UPDATE profiles
  SET 
    deleted_at = CURRENT_TIMESTAMP,
    last_admin_action = CURRENT_TIMESTAMP
  WHERE user_id = target_user_id;

  -- Remove user from auth system
  DELETE FROM auth.users WHERE id = target_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Student account deleted successfully',
    'user_id', target_user_id,
    'deleted_at', CURRENT_TIMESTAMP
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 4: FETCH STUDENTS WITH STATUS
-- ============================================================================

-- Function: Get all students with complete information for admin panel
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
  LEFT JOIN sessions s ON (s.user_id = p.user_id OR s.student_id = p.user_id)
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

-- ============================================================================
-- SECTION 5: ADMIN-GATED WRAPPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.suspend_student_admin(
  target_user_id uuid,
  suspension_reason text DEFAULT 'No reason provided'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  RETURN public.suspend_student(target_user_id, suspension_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.block_student_admin(
  target_user_id uuid,
  block_reason text DEFAULT 'No reason provided'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  RETURN public.block_student(target_user_id, block_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.unsuspend_student_admin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  RETURN public.unsuspend_student(target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_student_admin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  RETURN public.unblock_student(target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_student_account_admin(
  target_user_id uuid,
  reason text DEFAULT 'Account deletion requested'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  RETURN public.delete_student_account(target_user_id, reason);
END;
$$;

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
-- SECTION 6: GRANTS AND PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.admin_action_logs TO authenticated;
GRANT INSERT ON public.admin_action_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.suspend_student(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_student(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_student_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_students(integer, integer, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.suspend_student_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_student_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_student_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_student_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_student_account_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_students_list(integer, integer, text) TO authenticated;

-- ============================================================================
-- SECTION 7: ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.admin_action_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_action_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE public.admin_action_logs IS 'Comprehensive audit log for all admin actions on user accounts';

COMMENT ON FUNCTION public.suspend_student(uuid, text) IS 'Suspends a student account. Requires admin role.';

COMMENT ON FUNCTION public.block_student(uuid, text) IS 'Blocks a student account. Requires admin role.';

COMMENT ON FUNCTION public.unsuspend_student(uuid) IS 'Unsuspends a previously suspended student account. Requires admin role.';

COMMENT ON FUNCTION public.unblock_student(uuid) IS 'Unblocks a previously blocked student account. Requires admin role.';

COMMENT ON FUNCTION public.delete_student_account(uuid, text) IS 'Deletes a student account permanently. Requires admin role.';

COMMENT ON FUNCTION public.get_admin_students(integer, integer, text) IS 'Retrieves list of all students with their status and activity metrics for admin panel.';
