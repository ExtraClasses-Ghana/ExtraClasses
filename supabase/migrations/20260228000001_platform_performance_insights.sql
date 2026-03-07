-- =============================================================================
-- Platform Performance Insights: Aggregate Views & Analytics Functions
-- Migration: 20260228000001
--
-- Provides optimized data aggregation for admin performance analytics including:
-- - Student demographics by education level/category
-- - Revenue trends (daily/weekly/monthly)
-- - Subject-teacher distribution
-- =============================================================================

-- ============================================================================
-- SECTION 1: PERFORMANCE INDEXES FOR ANALYTICS
-- ============================================================================

-- Index for student demographics analysis
CREATE INDEX IF NOT EXISTS idx_profiles_education_level_created 
  ON public.profiles(education_level, created_at DESC)
  WHERE education_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_education_sub_category 
  ON public.profiles(education_sub_category, created_at DESC)
  WHERE education_sub_category IS NOT NULL;

-- Index for revenue trend analysis
CREATE INDEX IF NOT EXISTS idx_sessions_completed_created 
  ON public.sessions(status, created_at DESC)
  WHERE status = 'completed';

-- Index for subject distribution analysis
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_subjects 
  ON public.teacher_profiles USING GIN(subjects);

-- ============================================================================
-- SECTION 2: STUDENT DEMOGRAPHICS AGGREGATE VIEW
-- ============================================================================

-- View: Student demographics by education level
CREATE OR REPLACE VIEW public.student_demographics_by_level AS
SELECT
  p.education_level,
  COUNT(DISTINCT ur.user_id) as student_count,
  COUNT(DISTINCT CASE 
    WHEN DATE(ur.created_at AT TIME ZONE 'UTC') = CURRENT_DATE 
    THEN ur.user_id 
  END) as new_students_today,
  COUNT(DISTINCT CASE 
    WHEN ur.created_at AT TIME ZONE 'UTC' >= (CURRENT_DATE - INTERVAL '7 days') 
    THEN ur.user_id 
  END) as new_students_week,
  MIN(ur.created_at AT TIME ZONE 'UTC')::date as first_student_date,
  MAX(ur.created_at AT TIME ZONE 'UTC')::date as latest_student_date
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.role = 'student' AND p.education_level IS NOT NULL
GROUP BY p.education_level
ORDER BY student_count DESC;

-- View: Student demographics by sub-category
CREATE OR REPLACE VIEW public.student_demographics_by_category AS
SELECT
  p.education_sub_category,
  COUNT(DISTINCT ur.user_id) as student_count,
  COUNT(DISTINCT CASE 
    WHEN DATE(ur.created_at AT TIME ZONE 'UTC') = CURRENT_DATE 
    THEN ur.user_id 
  END) as new_students_today,
  COUNT(DISTINCT CASE 
    WHEN ur.created_at AT TIME ZONE 'UTC' >= (CURRENT_DATE - INTERVAL '7 days') 
    THEN ur.user_id 
  END) as new_students_week,
  MIN(ur.created_at AT TIME ZONE 'UTC')::date as first_student_date,
  MAX(ur.created_at AT TIME ZONE 'UTC')::date as latest_student_date
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.role = 'student' AND p.education_sub_category IS NOT NULL
GROUP BY p.education_sub_category
ORDER BY student_count DESC;

-- ============================================================================
-- SECTION 3: REVENUE TREND FUNCTIONS
-- ============================================================================

-- Function: Get daily revenue trend for the last N days
-- Returns: date, revenue for each day
CREATE OR REPLACE FUNCTION public.get_revenue_trends_daily(days_back integer DEFAULT 30)
RETURNS TABLE(
  trend_date date,
  revenue numeric,
  session_count integer,
  avg_session_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.session_date as trend_date,
    COALESCE(SUM(s.amount), 0)::numeric(12,2) as revenue,
    COUNT(*)::integer as session_count,
    CASE 
      WHEN COUNT(*) > 0 THEN (SUM(s.amount) / COUNT(*))::numeric(10,2)
      ELSE 0::numeric(10,2)
    END as avg_session_value
  FROM public.sessions s
  WHERE s.status = 'completed'
    AND s.session_date >= (CURRENT_DATE - (days_back || ' days')::INTERVAL)
  GROUP BY s.session_date
  ORDER BY s.session_date DESC;
$$;

-- Function: Get weekly revenue trend for the last N weeks
-- Returns: week, revenue for each week
CREATE OR REPLACE FUNCTION public.get_revenue_trends_weekly(weeks_back integer DEFAULT 12)
RETURNS TABLE(
  year integer,
  week integer,
  revenue numeric,
  session_count integer,
  avg_session_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM s.session_date)::integer as year,
    EXTRACT(WEEK FROM s.session_date)::integer as week,
    COALESCE(SUM(s.amount), 0)::numeric(12,2) as revenue,
    COUNT(*)::integer as session_count,
    CASE 
      WHEN COUNT(*) > 0 THEN (SUM(s.amount) / COUNT(*))::numeric(10,2)
      ELSE 0::numeric(10,2)
    END as avg_session_value
  FROM public.sessions s
  WHERE s.status = 'completed'
    AND s.session_date >= (CURRENT_DATE - (weeks_back || ' weeks')::INTERVAL)
  GROUP BY EXTRACT(YEAR FROM s.session_date), EXTRACT(WEEK FROM s.session_date)
  ORDER BY EXTRACT(YEAR FROM s.session_date) DESC, EXTRACT(WEEK FROM s.session_date) DESC;
$$;

-- Function: Get monthly revenue trend for the last N months
-- Returns: year, month, revenue for each month
CREATE OR REPLACE FUNCTION public.get_revenue_trends_monthly(months_back integer DEFAULT 12)
RETURNS TABLE(
  year integer,
  month integer,
  month_name text,
  revenue numeric,
  session_count integer,
  avg_session_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM DATE_TRUNC('month', s.session_date))::integer as year,
    EXTRACT(MONTH FROM DATE_TRUNC('month', s.session_date))::integer as month,
    TO_CHAR(DATE_TRUNC('month', s.session_date), 'Mon') as month_name,
    COALESCE(SUM(s.amount), 0)::numeric(12,2) as revenue,
    COUNT(*)::integer as session_count,
    CASE 
      WHEN COUNT(*) > 0 THEN (SUM(s.amount) / COUNT(*))::numeric(10,2)
      ELSE 0::numeric(10,2)
    END as avg_session_value
  FROM public.sessions s
  WHERE s.status = 'completed'
    AND s.session_date >= (CURRENT_DATE - (months_back || ' months')::INTERVAL)
  GROUP BY DATE_TRUNC('month', s.session_date)
  ORDER BY DATE_TRUNC('month', s.session_date) DESC;
$$;

-- ============================================================================
-- SECTION 4: SUBJECT-TEACHER DISTRIBUTION FUNCTIONS
-- ============================================================================

-- Function: Get subject distribution with teacher count
-- Returns: subject name, teacher count, avg hourly rate
CREATE OR REPLACE FUNCTION public.get_subject_teacher_distribution()
RETURNS TABLE(
  subject_name text,
  teacher_count integer,
  avg_hourly_rate numeric,
  total_revenue numeric,
  completed_sessions integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.name as subject_name,
    COUNT(DISTINCT CASE 
      WHEN tp.subjects @> ARRAY[s.name] THEN tp.user_id 
    END)::integer as teacher_count,
    COALESCE(AVG(CASE 
      WHEN tp.subjects @> ARRAY[s.name] THEN tp.hourly_rate 
    END), 0)::numeric(10,2) as avg_hourly_rate,
    COALESCE(SUM(CASE 
      WHEN sess.subject = s.name AND sess.status = 'completed' 
      THEN sess.amount 
      ELSE 0 
    END), 0)::numeric(12,2) as total_revenue,
    COUNT(DISTINCT CASE 
      WHEN sess.subject = s.name AND sess.status = 'completed' 
      THEN sess.id 
    END)::integer as completed_sessions
  FROM public.subjects s
  LEFT JOIN public.teacher_profiles tp ON tp.subjects @> ARRAY[s.name]
  LEFT JOIN public.sessions sess ON sess.subject = s.name
  WHERE s.is_active = true
  GROUP BY s.name
  ORDER BY teacher_count DESC, total_revenue DESC;
$$;

-- Function: Get detailed teacher per subject distribution
-- Returns: subject, list of teachers (for admin insights)
CREATE OR REPLACE FUNCTION public.get_teachers_by_subject(subject_name text DEFAULT NULL)
RETURNS TABLE(
  subject text,
  teacher_id uuid,
  teacher_name text,
  hourly_rate numeric,
  total_sessions integer,
  total_earnings numeric,
  rating decimal
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    unnest(tp.subjects) as subject,
    tp.user_id as teacher_id,
    p.full_name as teacher_name,
    tp.hourly_rate as hourly_rate,
    tp.total_sessions as total_sessions,
    tp.total_earnings as total_earnings,
    tp.rating as rating
  FROM public.teacher_profiles tp
  JOIN public.profiles p ON p.user_id = tp.user_id
  WHERE tp.is_verified = true
    AND (subject_name IS NULL OR subjects @> ARRAY[subject_name])
  ORDER BY tp.rating DESC, tp.total_sessions DESC;
$$;

-- ============================================================================
-- SECTION 5: COMPREHENSIVE ANALYTICS FUNCTION
-- ============================================================================

-- Function: Get all performance insights in one call
CREATE OR REPLACE FUNCTION public.get_platform_performance_insights()
RETURNS TABLE(
  metric_name text,
  metric_value text,
  metric_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'total_students' as metric_name, COUNT(DISTINCT user_id)::text, 'count'
  FROM public.user_roles WHERE role = 'student'
  UNION ALL
  SELECT 'total_teachers', COUNT(DISTINCT user_id)::text, 'count'
  FROM public.user_roles WHERE role = 'teacher'
  UNION ALL
  SELECT 'total_revenue', COALESCE(SUM(amount), 0)::text, 'amount'
  FROM public.sessions WHERE status = 'completed'
  UNION ALL
  SELECT 'completed_sessions', COUNT(*)::text, 'count'
  FROM public.sessions WHERE status = 'completed'
  UNION ALL
  SELECT 'avg_revenue_per_session', 
    CASE WHEN COUNT(*) > 0 
      THEN (SUM(amount) / COUNT(*))::numeric(10,2)::text 
      ELSE '0'::text 
    END, 'amount'
  FROM public.sessions WHERE status = 'completed'
  UNION ALL
  SELECT 'subjects_available', COUNT(*)::text, 'count'
  FROM public.subjects WHERE is_active = true;
$$;

-- ============================================================================
-- SECTION 6: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.student_demographics_by_level TO authenticated, anon;
GRANT SELECT ON public.student_demographics_by_category TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_revenue_trends_daily(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_revenue_trends_weekly(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_revenue_trends_monthly(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_subject_teacher_distribution() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_teachers_by_subject(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_performance_insights() TO authenticated, anon;

-- ============================================================================
-- SECTION 7: ADMIN-GATED WRAPPER FUNCTIONS
-- ============================================================================

-- Wrapper function with explicit RLS check (admin-only)
CREATE OR REPLACE FUNCTION public.get_student_demographics_admin()
RETURNS TABLE(
  education_level text,
  student_count integer,
  new_students_today integer,
  new_students_week integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to access analytics';
  END IF;

  RETURN QUERY
    SELECT 
      sdl.education_level,
      sdl.student_count,
      sdl.new_students_today,
      sdl.new_students_week
    FROM public.student_demographics_by_level sdl;
END;
$$;

-- Wrapper function with explicit RLS check (admin-only)
CREATE OR REPLACE FUNCTION public.get_revenue_trends_admin(period text DEFAULT 'daily', days_or_weeks_or_months integer DEFAULT 30)
RETURNS TABLE(
  trend_label text,
  revenue numeric,
  session_count integer,
  avg_session_value numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to access analytics';
  END IF;

  IF period = 'daily' THEN
    RETURN QUERY
      SELECT 
        to_char(trend_date, 'MMM DD')::text as trend_label,
        revenue,
        session_count,
        avg_session_value
      FROM public.get_revenue_trends_daily(days_or_weeks_or_months);
  ELSIF period = 'weekly' THEN
    RETURN QUERY
      SELECT 
        ('Week ' || week::text || ', ' || year::text)::text as trend_label,
        revenue,
        session_count,
        avg_session_value
      FROM public.get_revenue_trends_weekly(days_or_weeks_or_months);
  ELSIF period = 'monthly' THEN
    RETURN QUERY
      SELECT 
        (month_name || ' ' || year::text)::text as trend_label,
        revenue,
        session_count,
        avg_session_value
      FROM public.get_revenue_trends_monthly(days_or_weeks_or_months);
  ELSE
    RAISE EXCEPTION 'Invalid period. Use daily, weekly, or monthly';
  END IF;
END;
$$;

-- Wrapper function with explicit RLS check (admin-only)
CREATE OR REPLACE FUNCTION public.get_subject_distribution_admin()
RETURNS TABLE(
  subject_name text,
  teacher_count integer,
  avg_hourly_rate numeric,
  total_revenue numeric,
  completed_sessions integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to access analytics';
  END IF;

  RETURN QUERY
    SELECT * FROM public.get_subject_teacher_distribution();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_demographics_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_trends_admin(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subject_distribution_admin() TO authenticated;

-- ============================================================================
-- SECTION 8: DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON VIEW public.student_demographics_by_level IS
'Real-time view of student distribution by education level. Shows counts, new registrations, and date ranges.';

COMMENT ON VIEW public.student_demographics_by_category IS
'Real-time view of student distribution by education sub-category. Shows counts, new registrations, and date ranges.';

COMMENT ON FUNCTION public.get_revenue_trends_daily(integer) IS
'Returns daily revenue trends for specified number of days. Includes revenue, session count, and average session value.';

COMMENT ON FUNCTION public.get_revenue_trends_weekly(integer) IS
'Returns weekly revenue trends for specified number of weeks. Includes revenue, session count, and average session value.';

COMMENT ON FUNCTION public.get_revenue_trends_monthly(integer) IS
'Returns monthly revenue trends for specified number of months. Includes revenue, session count, and average session value.';

COMMENT ON FUNCTION public.get_subject_teacher_distribution() IS
'Returns subject distribution with teacher counts, average hourly rates, and revenue metrics per subject.';

COMMENT ON FUNCTION public.get_teachers_by_subject(text) IS
'Returns list of verified teachers for a specific subject or all subjects if null. Ordered by rating and total sessions.';

COMMENT ON FUNCTION public.get_platform_performance_insights() IS
'Returns key platform metrics including total users, revenue, and session statistics.';

COMMENT ON FUNCTION public.get_student_demographics_admin() IS
'Admin-gated version of student demographics. Requires admin role. Returns education level distribution.';

COMMENT ON FUNCTION public.get_revenue_trends_admin(text, integer) IS
'Admin-gated revenue trends function. Accepts period (daily/weekly/monthly) and duration. Requires admin role.';

COMMENT ON FUNCTION public.get_subject_distribution_admin() IS
'Admin-gated subject distribution function. Returns comprehensive subject-teacher metrics. Requires admin role.';
