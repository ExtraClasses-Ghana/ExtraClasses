-- Add DELETE policies so authenticated actors can perform deletes where intended
-- Timestamp: 2026-02-23

-- Sessions: allow session participants (student or teacher) to delete their sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
    BEGIN
      PERFORM 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END$$;

DROP POLICY IF EXISTS "Session participants can delete" ON public.sessions;
CREATE POLICY "Session participants can delete" ON public.sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = teacher_id);

-- Verification documents: allow teachers to delete their own uploaded docs
DROP POLICY IF EXISTS "Teachers can delete their own documents" ON public.verification_documents;
CREATE POLICY "Teachers can delete their own documents" ON public.verification_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Complaints: allow admins to delete complaints
DROP POLICY IF EXISTS "Admins can delete complaints" ON public.complaints;
CREATE POLICY "Admins can delete complaints" ON public.complaints
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- If you need other delete policies (e.g., admin_notifications), ensure they're covered elsewhere.
