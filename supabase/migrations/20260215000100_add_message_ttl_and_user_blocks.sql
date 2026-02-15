-- Add expires_at column to messages so messages can auto-expire after 24 hours
ALTER TABLE IF EXISTS public.messages
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours');

-- Create user_blocks table to support per-user blocking
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id)
);

-- Optional: cleanup function to delete expired messages
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.messages WHERE expires_at IS NOT NULL AND expires_at <= now();
END;
$$;

-- Try to schedule the cleanup using pg_cron if available. If your Supabase project
-- does not have pg_cron enabled, create a scheduled task in the Supabase dashboard
-- (Edge Function or Scheduled SQL) to call: SELECT public.delete_expired_messages();

DO $$
BEGIN
  -- Create extension if possible (may fail on managed envs)
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'pg_cron not available; please schedule delete_expired_messages manually.';
  END;

  -- Schedule job every hour to prune expired messages (if pg_cron is installed)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('prune_expired_messages', '0 * * * *', $$SELECT public.delete_expired_messages();$$);
  END IF;
END$$;

-- Note:
-- 1) If pg_cron isn't available, create a Supabase Scheduled Function or external cron
--    that runs: SELECT public.delete_expired_messages();
-- 2) This migration adds server-side support for auto-deleting messages older than 24 hours.
-- 3) Existing messages will keep their NULL expires_at unless updated; to set expires
--    for existing rows you can run an UPDATE that sets expires_at = created_at + interval '24 hours'
--    where expires_at IS NULL.
