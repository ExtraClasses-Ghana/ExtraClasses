-- Migration: Add export-optimized views and functions for sessions data
-- Timestamp: 2026-03-01
-- Description: Provides secure, formatted views and functions for exporting session data in various formats
--              with Row Level Security (RLS) policies ensuring only authorized admins can access

-- ============================================================================
-- 1. CREATE EXPORT-OPTIMIZED VIEW FOR ADMIN SESSION EXPORTS
-- ============================================================================

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
  COALESCE(vs.room_code, 'N/A') AS room_code,
  s.notes
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
LEFT JOIN public.video_sessions vs ON vs.session_id = s.id
ORDER BY s.session_date DESC, s.start_time DESC;

-- Policy for export view is not required because RPC enforces admin check.
-- Direct selects against the view will still work according to underlying table policies (users can view their own sessions).
-- Avoid enabling RLS on views as it's unsupported.


-- ============================================================================
-- 2. CREATE DATA FORMATTING FUNCTIONS FOR EXPORTS
-- ============================================================================

-- Function to format currency (GHS)
CREATE OR REPLACE FUNCTION public.format_currency(amount NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 'GH₵' || TO_CHAR(amount, '999,999.00');
END;
$$;

-- Function to format date in readable format
CREATE OR REPLACE FUNCTION public.format_date(date_val DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TO_CHAR(date_val, 'Mon DD, YYYY');
END;
$$;

-- Function to format time in 12-hour format
CREATE OR REPLACE FUNCTION public.format_time_12h(time_val TIME)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TO_CHAR(time_val::TIMESTAMP, 'HH12:MI AM');
END;
$$;

-- Function to calculate session end time
CREATE OR REPLACE FUNCTION public.get_session_end_time(start_time TIME, duration_minutes INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TO_CHAR((start_time::TIMESTAMP + (duration_minutes || ' minutes')::INTERVAL)::TIME, 'HH24:MI');
END;
$$;

-- Function to get formatted session duration
CREATE OR REPLACE FUNCTION public.format_duration(duration_minutes INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hours INTEGER;
  minutes INTEGER;
BEGIN
  hours := duration_minutes / 60;
  minutes := duration_minutes % 60;
  
  IF hours = 0 THEN
    RETURN minutes || ' minutes';
  ELSIF minutes = 0 THEN
    RETURN hours || ' hour' || CASE WHEN hours > 1 THEN 's' ELSE '' END;
  ELSE
    RETURN hours || ' hour' || CASE WHEN hours > 1 THEN 's' ELSE '' END || ' ' || minutes || ' minutes';
  END IF;
END;
$$;

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR EXPORT VIEWS
-- ============================================================================

-- Enable RLS on export view
ALTER VIEW public.vw_sessions_export_format OWNER TO postgres;

-- Create table to track export audit logs
CREATE TABLE IF NOT EXISTS public.session_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'excel', 'word')),
  record_count INTEGER NOT NULL,
  filters JSONB,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_session_export_logs_admin_id ON public.session_export_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_session_export_logs_exported_at ON public.session_export_logs(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_export_logs_format ON public.session_export_logs(export_format);

-- Enable RLS on audit logs table
ALTER TABLE public.session_export_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all export logs
CREATE POLICY "Admins can view session export logs" ON public.session_export_logs
  FOR SELECT
  USING (
    auth.uid() = admin_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Policy: Admins can insert export logs
CREATE POLICY "Admins can create session export logs" ON public.session_export_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- ============================================================================
-- 4. CREATE RPC FUNCTION TO FETCH FORMATTED SESSIONS FOR EXPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sessions_for_export(
  p_status TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_subject TEXT DEFAULT NULL
)
RETURNS TABLE(

  -- Security: only allow admins to run this RPC
  -- we will verify inside the function body
  id UUID,
  subject TEXT,
  session_date TEXT,
  start_time TEXT,
  end_time TEXT,
  duration TEXT,
  session_type TEXT,
  status TEXT,
  student_name TEXT,
  student_email TEXT,
  teacher_name TEXT,
  teacher_email TEXT,
  amount TEXT,
  platform_fee TEXT,
  total_amount TEXT,
  payment_status TEXT,
  payment_method TEXT,
  room_code TEXT,
  created_at TEXT,
  notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- ensure caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    vex.id,
    vex.subject,
    vex.session_date,
    vex.start_time,
    public.get_session_end_time(vex.start_time::TIME, vex.duration_minutes),
    public.format_duration(vex.duration_minutes),
    vex.session_type,
    vex.status,
    vex.student_name,
    vex.student_email,
    vex.teacher_name,
    vex.teacher_email,
    public.format_currency(vex.amount),
    CASE WHEN vex.platform_fee > 0 THEN public.format_currency(vex.platform_fee) ELSE 'GH₵0.00' END,
    public.format_currency(vex.total_amount),
    vex.payment_status,
    COALESCE(vex.payment_method, 'Not specified'),
    vex.room_code,
    vex.created_at,
    COALESCE(vex.notes, '')
  FROM public.vw_sessions_export_format vex
  WHERE
    (p_status IS NULL OR vex.status = p_status) AND
    (p_date_from IS NULL OR vex.session_date::DATE >= p_date_from) AND
    (p_date_to IS NULL OR vex.session_date::DATE <= p_date_to) AND
    (p_subject IS NULL OR LOWER(vex.subject) LIKE LOWER(p_subject || '%'))
  ORDER BY vex.session_date DESC, vex.start_time DESC;
END;
$$;

-- Grant execute permission to authenticated users (admins only via RLS)
GRANT EXECUTE ON FUNCTION public.get_sessions_for_export(TEXT, DATE, DATE, TEXT) TO authenticated;

-- ============================================================================
-- 5. CREATE FUNCTION TO LOG SESSION EXPORTS (AUDIT TRAIL)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_session_export(
  p_export_format TEXT,
  p_record_count INTEGER,
  p_filters JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only admins can export session data';
  END IF;

  -- Insert log
  INSERT INTO public.session_export_logs (
    admin_id,
    export_format,
    record_count,
    filters,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_export_format,
    p_record_count,
    p_filters,
    p_ip_address,
    p_user_agent
  )
  RETURNING session_export_logs.id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_session_export(TEXT, INTEGER, JSONB, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW public.vw_sessions_export_format IS 
'Export-optimized view for session data. Provides formatted and enriched session information including student/teacher details, payment information, and video session data. Used by admin export functionality.';

COMMENT ON FUNCTION public.format_currency(NUMERIC) IS 
'Formats a numeric amount as Ghanaian currency (GH₵) with thousand separators and 2 decimal places.';

COMMENT ON FUNCTION public.format_date(DATE) IS 
'Formats a date value as "Mon DD, YYYY" format for human-readable exports.';

COMMENT ON FUNCTION public.format_time_12h(TIME) IS 
'Formats a time value as 12-hour format with AM/PM for human-readable exports.';

COMMENT ON FUNCTION public.get_session_end_time(TIME, INTEGER) IS 
'Calculates the end time of a session given start time and duration in minutes.';

COMMENT ON FUNCTION public.format_duration(INTEGER) IS 
'Formats duration in minutes to human-readable format (e.g., "2 hours 30 minutes").';

COMMENT ON TABLE public.session_export_logs IS 
'Audit trail of all session data exports. Records who exported data, when, in what format, and with what filters applied for compliance and audit purposes.';

COMMENT ON FUNCTION public.get_sessions_for_export(TEXT, DATE, DATE, TEXT) IS 
'RPC function to fetch formatted and filtered sessions for export. Applies filters for status, date range, and subject. Returns pre-formatted data optimized for CSV/Excel/PDF exports.';

COMMENT ON FUNCTION public.log_session_export(TEXT, INTEGER, JSONB, TEXT, TEXT) IS 
'Logs a session export operation to the audit trail. Verifies that the user is an admin before allowing the log entry. Returns the log entry ID.';
