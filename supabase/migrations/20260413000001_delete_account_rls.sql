-- =============================================================================
-- Account Deletion Policies & RPC Function
-- Allows users to delete their own accounts, and admins to delete any account.
-- =============================================================================

-- 1. RLS Policies for direct table deletion (fallback methods)

-- Allow users to delete their own profile records
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own teacher profile" ON public.teacher_profiles;
CREATE POLICY "Users can delete their own teacher profile" ON public.teacher_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to delete any profile records
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete any teacher profile" ON public.teacher_profiles;
CREATE POLICY "Admins can delete any teacher profile" ON public.teacher_profiles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- 2. Secure RPC to totally delete the auth.users account
-- Since Supabase blocks direct deletions from auth.users from the client via standard RLS,
-- we use a SECURITY DEFINER function to bypass the restriction securely.

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate permission: allow if user is deleting themselves OR if user is an admin
  IF auth.uid() = target_user_id OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    -- Deletion of auth.users automatically cascades and deletes profiles, teacher_profiles, 
    -- sessions, and all other related records according to the foreign key 'ON DELETE CASCADE'
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to delete this account. You can only delete your own account unless you are an admin.';
  END IF;
END;
$$;
