-- Migration: Add education levels master table and relationships
-- Timestamp: 2026-03-01

-- 1. Create education_levels master table
CREATE TABLE IF NOT EXISTS public.education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on name only if the column exists (defensive for existing DBs)
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'education_levels' AND column_name = 'name'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_education_levels_name ON public.education_levels (name);
  END IF;
END$$;

-- 2. Create assignment table for teachers -> education levels (many-to-many)
CREATE TABLE IF NOT EXISTS public.teacher_education_levels (
  teacher_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  education_level_id UUID NOT NULL REFERENCES public.education_levels(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_user_id, education_level_id)
);

-- Defensive index creation for teacher_education_levels
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_education_levels' AND column_name = 'education_level_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_teacher_education_levels_level ON public.teacher_education_levels (education_level_id);
  END IF;

  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_education_levels' AND column_name = 'teacher_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_teacher_education_levels_teacher ON public.teacher_education_levels (teacher_user_id);
  END IF;
END$$;

-- 3. Enable RLS and policies
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_education_levels ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to SELECT education levels (used on signup and find-teachers filters)
CREATE POLICY "public select education levels" ON public.education_levels
  FOR SELECT
  USING (true);

-- Restrict INSERT/UPDATE/DELETE to admins only
CREATE POLICY "admins manage education levels" ON public.education_levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Policies for teacher_education_levels: select allowed to authenticated (frontend will join), modifications restricted to admins
CREATE POLICY "authenticated select teacher levels" ON public.teacher_education_levels
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admins manage teacher_education_levels" ON public.teacher_education_levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- 4. Utility function: return teacher user ids for a given education level
CREATE OR REPLACE FUNCTION public.get_teacher_user_ids_by_education_level(p_level_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  SELECT teacher_user_id FROM public.teacher_education_levels WHERE education_level_id = p_level_id;
$$;

GRANT SELECT ON TABLE public.education_levels TO public;
GRANT SELECT ON TABLE public.teacher_education_levels TO authenticated;

COMMENT ON TABLE public.education_levels IS 'Master list of education levels / categories used across signup and teacher profiles.';
COMMENT ON TABLE public.teacher_education_levels IS 'Assignment table linking teacher user ids to education level ids.';
