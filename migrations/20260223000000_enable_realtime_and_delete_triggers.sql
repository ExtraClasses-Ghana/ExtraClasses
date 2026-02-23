-- Migration: Enable realtime replication for key tables and add delete triggers
-- Timestamp: 2026-02-23

-- Ensure the supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END$$;

-- Add tables to the supabase_realtime publication if they are not already included
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'sessions',
    'video_sessions',
    'complaints',
    'verification_documents',
    'profiles',
    'teacher_profiles',
    'payments',
    'favorite_teachers',
    'admin_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END$$;

-- Create a trigger function to cascade-delete session-related records (example: video_sessions)
-- This ensures related rows are removed when a session is deleted so realtime clients receive the change
CREATE OR REPLACE FUNCTION public.cascade_delete_session_dependencies()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- remove related video session if exists
  DELETE FROM public.video_sessions WHERE session_id = OLD.id;

  -- add other cleanup rules here if needed (e.g., messages, notifications)
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_session_delete ON public.sessions;
CREATE TRIGGER trg_cascade_session_delete
AFTER DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_session_dependencies();

-- Optionally: create triggers for other tables that require cascading cleanup
-- Example: when a verification_documents row is deleted, remove any linked admin_notifications
CREATE OR REPLACE FUNCTION public.cascade_delete_verification_doc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.admin_notifications WHERE related_entity_id = OLD.id AND related_user_id = OLD.teacher_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_verification_doc_delete ON public.verification_documents;
CREATE TRIGGER trg_cascade_verification_doc_delete
AFTER DELETE ON public.verification_documents
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_verification_doc();

-- Migration complete
