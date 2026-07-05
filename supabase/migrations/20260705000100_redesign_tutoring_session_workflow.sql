-- Migration: Redesign Tutoring Session Video Call Workflow
-- Timestamp: 2026-07-05 12:41:00

-- 1. Safely drop legacy tables
DROP TABLE IF EXISTS public.video_signaling CASCADE;
DROP TABLE IF EXISTS public.video_sessions CASCADE;

-- 2. Add meeting link, platform, and admin audit columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS meeting_platform TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS admin_checked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS admin_joined_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS inspected_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Recreate public.vw_sessions_export_format view without video_sessions dependency
CREATE OR REPLACE VIEW public.vw_sessions_export_format AS
SELECT
  s.id,
  s.subject,
  TO_CHAR(s.session_date, 'YYYY-MM-DD') AS session_date,
  TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
  s.duration_minutes,
  s.session_type,
  s.status,
  s.amount,
  s.platform_fee,
  (s.amount + COALESCE(s.platform_fee, 0))::NUMERIC(10,2) AS total_amount,
  TO_CHAR(s.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
  TO_CHAR(s.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
  s.student_id,
  sp.email AS student_email,
  sp.full_name AS student_name,
  s.teacher_id,
  tp.email AS teacher_email,
  tp.full_name AS teacher_name,
  COALESCE(p.status, 'pending') AS payment_status,
  p.payment_method,
  p.transaction_ref,
  COALESCE(s.meeting_link, 'N/A') AS room_code, -- map meeting_link to room_code for backwards compatibility in exports
  s.notes,
  s.meeting_link,
  s.meeting_platform,
  s.admin_checked,
  s.admin_joined_at,
  s.inspected_by_admin_id
FROM public.sessions s
LEFT JOIN public.profiles sp ON sp.user_id = s.student_id
LEFT JOIN public.profiles tp ON tp.user_id = s.teacher_id
LEFT JOIN LATERAL (
  SELECT status, payment_method, transaction_ref 
  FROM public.payments 
  WHERE session_id = s.id 
  ORDER BY created_at DESC 
  LIMIT 1
) p ON true
ORDER BY s.session_date DESC, s.start_time DESC;

-- 4. Recreate public.get_admin_sessions() function with audit columns
CREATE OR REPLACE FUNCTION public.get_admin_sessions()
RETURNS TABLE(
  id uuid,
  subject text,
  session_date date,
  start_time time,
  duration_minutes integer,
  session_type text,
  status text,
  amount numeric,
  platform_fee numeric,
  created_at timestamptz,
  student_id uuid,
  student_name text,
  student_email text,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  payment_status text,
  meeting_link text,
  meeting_platform text,
  admin_checked boolean,
  admin_joined_at timestamptz,
  inspected_by_admin_id uuid,
  inspected_by_admin_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.id,
    s.subject,
    s.session_date,
    s.start_time,
    s.duration_minutes,
    s.session_type,
    s.status,
    s.amount,
    s.platform_fee,
    s.created_at,
    s.student_id,
    sp.full_name AS student_name,
    sp.email AS student_email,
    s.teacher_id,
    tp.full_name AS teacher_name,
    tp.email AS teacher_email,
    p.status AS payment_status,
    s.meeting_link,
    s.meeting_platform,
    s.admin_checked,
    s.admin_joined_at,
    s.inspected_by_admin_id,
    ap.full_name AS inspected_by_admin_name
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.user_id = s.student_id
  LEFT JOIN public.profiles tp ON tp.user_id = s.teacher_id
  LEFT JOIN public.profiles ap ON ap.user_id = s.inspected_by_admin_id
  LEFT JOIN LATERAL (
    SELECT status FROM public.payments WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1
  ) p ON true
  ORDER BY s.session_date DESC, s.start_time DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_sessions() TO authenticated;

-- 5. Create log_admin_session_join function to register admin session quality checks
CREATE OR REPLACE FUNCTION public.log_admin_session_join(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can log session joins.';
  END IF;

  UPDATE public.sessions
  SET 
    admin_checked = true,
    admin_joined_at = now(),
    inspected_by_admin_id = auth.uid(),
    updated_at = now()
  WHERE id = p_session_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_session_join(UUID) TO authenticated;
