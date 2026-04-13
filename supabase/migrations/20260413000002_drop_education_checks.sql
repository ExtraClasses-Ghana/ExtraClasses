-- =============================================================================
-- Migration: Drop Legacy Education Level Check Constraints
-- Why: The app now uses dynamic education levels from the db, so strict hardcoded
-- checks prevent valid profile submissions. Let's securely lift these checks.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Dynamically find and drop ALL check constraints on education_level for teacher_profiles
    FOR r IN (
        SELECT conname, relname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname IN ('profiles', 'teacher_profiles', 'subjects')
          AND confupdtype = 'a' OR contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%education_level%'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.relname) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;

    -- Dynamically find and drop ALL check constraints on education_sub_category
    FOR r IN (
        SELECT conname, relname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname IN ('profiles', 'teacher_profiles', 'subjects')
          AND contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%education_sub_category%'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.relname) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END
$$;

-- Just in case they are explicitly named, try dropping them generically too
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_education_level_check CASCADE;
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_education_sub_category_check CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_education_level_check CASCADE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_education_sub_category_check CASCADE;

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_education_level_check CASCADE;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_education_sub_category_check CASCADE;
