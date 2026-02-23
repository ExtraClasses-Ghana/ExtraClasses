-- Migration: create helper RPC to return student users for admin UI
-- Timestamp: 2026-02-23

CREATE OR REPLACE FUNCTION public.get_admin_students()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  region text,
  status text,
  role public.app_role,
  role_assigned_at timestamptz,
  user_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.id,
    u.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.region,
    p.status,
    ur.role,
    ur.created_at AS role_assigned_at,
    u.created_at AS user_created_at
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY p.full_name NULLS LAST, u.email;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_students() TO authenticated;
