-- Restructuring verification_status to strictly enforced predefined values (acting like an ENUM dropdown)
-- This ensures the DB precisely matches the Dropdown status system on Admin Verification

DO $$ 
BEGIN
  -- 1. Safely convert any existing messy or typo statuses to 'pending' to prevent constraint failure
  UPDATE public.teacher_profiles 
  SET verification_status = 'pending' 
  WHERE verification_status NOT IN ('pending', 'in_review', 'verified', 'rejected');

  -- 2. Drop existing constraint if it accidentally existed previously
  ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_verification_status_check;

  -- 3. Add the strict constraint matching the frontend dropdown system
  ALTER TABLE public.teacher_profiles 
  ADD CONSTRAINT teacher_profiles_verification_status_check 
  CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected'));
END $$;
