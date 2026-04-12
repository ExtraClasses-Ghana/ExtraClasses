-- Migration to remove static education level checks on the subjects table
-- Since the platform transitioned to a dynamic education level model,
-- the hardcoded constraint restricts inserting new dynamic subjects.

DO $$ 
BEGIN
  -- We attempt to drop the constraint safely
  ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_education_level_check;
END $$;
