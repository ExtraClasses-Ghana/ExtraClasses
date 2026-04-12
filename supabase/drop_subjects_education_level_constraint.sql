-- Since we migrated education levels to a dynamic table format,
-- the static check constraint on the subjects table needs to be removed.
-- This script safely drops the restrictive check constraint.

DO $$ 
BEGIN
  -- Attempt to drop the constraint if it exists
  ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_education_level_check;
  
  -- Also drop any other related constraints that might have been named differently
  ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_education_levels_check;
  
  RAISE NOTICE 'Constraint dropped successfully';
END $$;
