-- Migration: create helper RPC to return enriched session bookings for admin UI
-- Timestamp: 2026-02-23

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
  room_code text
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
    vs.room_code
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.user_id = s.student_id
  LEFT JOIN public.profiles tp ON tp.user_id = s.teacher_id
  LEFT JOIN LATERAL (
    SELECT status FROM public.payments WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1
  ) p ON true
  LEFT JOIN public.video_sessions vs ON vs.session_id = s.id
  ORDER BY s.session_date DESC, s.start_time DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_sessions() TO authenticated;
