-- Make session_id nullable in reviews table to allow reviews without completed sessions
ALTER TABLE public.reviews
ALTER COLUMN session_id DROP NOT NULL;

-- Add foreign key constraints to complaints table if not already present
ALTER TABLE public.complaints
ADD CONSTRAINT fk_complaints_reporter_id
  FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_complaints_reported_user_id
  FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
