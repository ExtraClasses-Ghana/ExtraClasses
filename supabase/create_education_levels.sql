-- Complete SQL to create education_levels table
-- Copy and paste this into your Supabase SQL Editor

-- Create table (will be skipped if it exists)
CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (will be skipped if already enabled)
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "public select education levels" ON public.education_levels;
DROP POLICY IF EXISTS "admins manage education levels" ON public.education_levels;

-- Allow public read access
CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Insert sample data (only if table is empty)
INSERT INTO public.education_levels (name, slug, description, position)
SELECT * FROM (VALUES
  ('Basic Education', 'basic-education', 'Primary and basic education levels', 1),
  ('Junior High School', 'junior-high-school', 'JHS education level', 2),
  ('Senior High School', 'senior-high-school', 'SHS education level', 3),
  ('College of Health Sciences', 'college-of-health-sciences', 'Health sciences programs', 4),
  ('University', 'university', 'University level education', 5)
) AS v(name, slug, description, position)
WHERE NOT EXISTS (SELECT 1 FROM public.education_levels LIMIT 1);