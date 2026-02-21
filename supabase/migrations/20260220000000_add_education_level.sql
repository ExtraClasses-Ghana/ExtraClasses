-- Add education_level and education_sub_category to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('Basic', 'Secondary', 'Tertiary')),
ADD COLUMN IF NOT EXISTS education_sub_category TEXT CHECK (education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', NULL));

-- Add education_level and education_sub_category to teacher_profiles table
ALTER TABLE public.teacher_profiles 
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('Basic', 'Secondary', 'Tertiary')),
ADD COLUMN IF NOT EXISTS education_sub_category TEXT CHECK (education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', NULL));

-- Create education_levels lookup table for reference
CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create education_sub_categories lookup table for Tertiary level
CREATE TABLE IF NOT EXISTS public.education_sub_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed education levels
INSERT INTO public.education_levels (level_name, description, sort_order) VALUES
  ('Basic', 'Primary/Basic Education (JHS)', 1),
  ('Secondary', 'Secondary Education (SHS)', 2),
  ('Tertiary', 'Higher Education (Tertiary)', 3)
ON CONFLICT (level_name) DO NOTHING;

-- Seed education sub-categories (only for Tertiary)
INSERT INTO public.education_sub_categories (category_name, description, sort_order) VALUES
  ('Nursing', 'Nursing Programs', 1),
  ('Midwifery', 'Midwifery Programs', 2),
  ('Health College', 'Health Science Colleges', 3),
  ('Teacher Training College', 'Teacher Training Institutions', 4),
  ('Universities', 'University Programs', 5)
ON CONFLICT (category_name) DO NOTHING;

-- Enable RLS on lookup tables
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_sub_categories ENABLE ROW LEVEL SECURITY;

-- Policies for lookup tables (public read access)
CREATE POLICY "Anyone can view education levels"
  ON public.education_levels
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view education sub-categories"
  ON public.education_sub_categories
  FOR SELECT
  USING (true);

-- Link education level to subjects table
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('Basic', 'Secondary', 'Tertiary')),
ADD COLUMN IF NOT EXISTS education_sub_category TEXT CHECK (education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', NULL));

-- Create index for filtering by education level
CREATE INDEX IF NOT EXISTS idx_profiles_education_level ON public.profiles(education_level);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_education_level ON public.teacher_profiles(education_level);
CREATE INDEX IF NOT EXISTS idx_subjects_education_level ON public.subjects(education_level);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_education_sub_category ON public.teacher_profiles(education_sub_category);
