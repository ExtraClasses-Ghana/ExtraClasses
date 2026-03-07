-- Migration: Add `position` column to education_levels for ordering
-- Timestamp: 2026-03-02

-- Add column if it doesn't exist
ALTER TABLE IF EXISTS public.education_levels
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Populate position for existing rows using created_at ordering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='education_levels' AND column_name='position') THEN
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
      FROM public.education_levels
    )
    UPDATE public.education_levels l
    SET position = o.rn
    FROM ordered o
    WHERE l.id = o.id;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_education_levels_position ON public.education_levels (position);

-- Grant update/select
GRANT SELECT, UPDATE ON public.education_levels TO authenticated;

COMMENT ON COLUMN public.education_levels.position IS 'Integer used to persist manual ordering of education levels in admin UI.';
