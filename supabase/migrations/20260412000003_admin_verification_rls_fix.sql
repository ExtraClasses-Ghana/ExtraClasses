-- ExtraClass: Fix Administrator privileges for verifying Teacher Profiles
-- Earlier, only teachers could update their own profiles resulting in silent admin update failures

DO $$ 
BEGIN
    -- 1. Grant Admins UPDATE access to teacher_profiles
    DROP POLICY IF EXISTS "Admins can update teacher profiles" ON public.teacher_profiles;
    CREATE POLICY "Admins can update teacher profiles" 
    ON public.teacher_profiles 
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

    -- 2. Grant Admins UPDATE access to standard user profiles (to set them to 'active')
    DROP POLICY IF EXISTS "Admins can update user profiles" ON public.profiles;
    CREATE POLICY "Admins can update user profiles" 
    ON public.profiles 
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

    -- 3. Grant Admins UPDATE access to verification_documents (to approve/reject files)
    DROP POLICY IF EXISTS "Admins can update verification documents" ON public.verification_documents;
    CREATE POLICY "Admins can update verification documents" 
    ON public.verification_documents 
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
END $$;
