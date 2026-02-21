-- =============================================================================
-- ExtraClass: Realtime for teacher_profiles and verification_documents
-- Run this if your DB was created before these were added to realtime.
-- Enables teacher dashboard, settings, and admin verification to receive
-- live updates when verification_status or document status changes.
-- =============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index for admin/overview queries filtering by verification_status
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_verification_status
  ON public.teacher_profiles(verification_status);
