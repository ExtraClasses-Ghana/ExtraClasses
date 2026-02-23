-- Migration: create helper to get count of pending sessions (used for admin UI badge)
-- Timestamp: 2026-02-23

-- Create a stable, security-definer function that returns the count of pending sessions.
-- This function filters sessions with status 'pending' and session_date >= current_date.
CREATE OR REPLACE FUNCTION public.get_pending_sessions_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.sessions
  WHERE status = 'pending' AND session_date >= current_date;
$$;

-- Allow authenticated role to execute the function (so the frontend can call RPC)
GRANT EXECUTE ON FUNCTION public.get_pending_sessions_count() TO authenticated;

-- Optionally, create a view for convenience (not required):
-- CREATE OR REPLACE VIEW public.pending_sessions_count_view AS
-- SELECT public.get_pending_sessions_count() AS count;
