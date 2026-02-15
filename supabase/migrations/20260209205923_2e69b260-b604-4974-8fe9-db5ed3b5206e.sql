
-- Add achievements column to teacher_profiles
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}'::text[];
