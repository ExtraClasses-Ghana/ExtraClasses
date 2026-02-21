-- =============================================================================
-- ExtraClass: Verification status only
-- Use this so the verification page and teacher pages (dashboard, settings)
-- share the same verification_status values and get realtime updates.
-- Values: pending, in_review (Processing), verified (Approved), rejected.
-- =============================================================================

-- Ensure teacher_profiles has verification_status column
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Enforce allowed values (pending, in_review, verified, rejected)
DO $$
BEGIN
  ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_verification_status_check;
  ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_verification_status_check
    CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Index for verification page and admin overview (filter by status)
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_verification_status
  ON public.teacher_profiles(verification_status);

-- Realtime: verification page and teacher dashboard/settings listen to these
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
