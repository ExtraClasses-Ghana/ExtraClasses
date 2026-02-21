-- Update Education Category to new flat list: Basic, JHS, SHS, College Of Healths, University, Cyber Secutity, Graphic Design, Web Design
-- Migrate existing data first, then update constraints

-- Migrate profiles: Secondary -> SHS, Tertiary -> University
UPDATE public.profiles SET education_level = 'SHS' WHERE education_level = 'Secondary';
UPDATE public.profiles SET education_level = 'University' WHERE education_level = 'Tertiary';

-- Migrate teacher_profiles: Secondary -> SHS, Tertiary -> University
UPDATE public.teacher_profiles SET education_level = 'SHS' WHERE education_level = 'Secondary';
UPDATE public.teacher_profiles SET education_level = 'University' WHERE education_level = 'Tertiary';

-- Drop existing CHECK constraints and add new ones

-- profiles.education_level
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_education_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_education_level_check
  CHECK (education_level IN ('Basic', 'JHS', 'SHS', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design'));

-- profiles.education_sub_category: make nullable, expand for backward compat (optional)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_education_sub_category_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_education_sub_category_check
  CHECK (education_sub_category IS NULL OR education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design'));

-- teacher_profiles.education_level
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_education_level_check;
ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_education_level_check
  CHECK (education_level IN ('Basic', 'JHS', 'SHS', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design'));

-- teacher_profiles.education_sub_category
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_education_sub_category_check;
ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_education_sub_category_check
  CHECK (education_sub_category IS NULL OR education_sub_category IN ('Nursing', 'Midwifery', 'Health College', 'Teacher Training College', 'Universities', 'College Of Healths', 'University', 'Cyber Secutity', 'Graphic Design', 'Web Design'));

-- subjects table keeps original Basic/Secondary/Tertiary for subject categorization
-- (subjects are filtered via mapping in the app when user selects new education category)
