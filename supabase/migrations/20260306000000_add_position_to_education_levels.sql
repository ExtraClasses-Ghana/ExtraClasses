-- Migration: Add position column to education_levels table
-- Timestamp: 2026-03-06

-- Add position column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'education_levels' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.education_levels ADD COLUMN position INTEGER DEFAULT 0;
    
    -- Set initial position values based on created_at order
    WITH ranked_levels AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
      FROM public.education_levels
    )
    UPDATE public.education_levels el
    SET position = rl.rn
    FROM ranked_levels rl
    WHERE el.id = rl.id;
  END IF;
END$$;
