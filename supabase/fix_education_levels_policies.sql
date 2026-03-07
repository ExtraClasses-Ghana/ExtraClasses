-- Fix existing education_levels table policies
-- Run this if you get policy already exists errors

-- Drop existing policies
DROP POLICY IF EXISTS "public select education levels" ON public.education_levels;
DROP POLICY IF EXISTS "admins manage education levels" ON public.education_levels;

-- Recreate policies
CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT USING (true);

CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Check if table has data, if not add sample data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.education_levels LIMIT 1) THEN
    INSERT INTO public.education_levels (name, slug, description, position) VALUES
    ('Basic Education', 'basic-education', 'Primary and basic education levels', 1),
    ('Junior High School', 'junior-high-school', 'JHS education level', 2),
    ('Senior High School', 'senior-high-school', 'SHS education level', 3),
    ('College of Health Sciences', 'college-of-health-sciences', 'Health sciences programs', 4),
    ('University', 'university', 'University level education', 5);
  END IF;
END $$;