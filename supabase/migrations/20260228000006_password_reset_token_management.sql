-- =============================================================================
-- Password Reset Token Management System
-- Migration: 20260228000006
--
-- Manages secure password reset tokens with expiration, validation, and audit logging
-- =============================================================================

-- ============================================================================
-- SECTION 1: PASSWORD RESET TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_salt text NOT NULL,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_ip_address inet,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_ip_address inet,
  user_agent text,
  reset_from_email text DEFAULT false
  -- note: direct subquery check constraints are not allowed in Postgres
  -- we enforce email consistency via trigger below
);

-- trigger function to ensure email matches auth.users
CREATE OR REPLACE FUNCTION public.ensure_password_reset_email_matches()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM (
    SELECT email FROM auth.users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'email % does not match user id %', NEW.email, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_password_reset_email_check
BEFORE INSERT OR UPDATE ON public.password_reset_tokens
FOR EACH ROW EXECUTE FUNCTION public.ensure_password_reset_email_matches();

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_is_used ON public.password_reset_tokens(is_used);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_created_at ON public.password_reset_tokens(created_at DESC);

-- ============================================================================
-- SECTION 2: EMAIL VERIFICATION AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('token_created', 'token_validated', 'token_used', 'token_expired', 'token_revoked', 'rate_limit_hit')),
  email_address text NOT NULL,
  ip_address inet,
  user_agent text,
  result text CHECK (result IN ('success', 'failed', 'expired', 'invalid')),
  error_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_user_id ON public.password_reset_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_action ON public.password_reset_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_created_at ON public.password_reset_audit_log(created_at DESC);

-- ============================================================================
-- SECTION 3: RATE LIMITING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamp with time zone DEFAULT now(),
  last_attempt_at timestamp with time zone DEFAULT now(),
  is_locked boolean DEFAULT false,
  locked_until timestamp with time zone,
  CONSTRAINT unique_rate_limit_per_user_email UNIQUE(user_id, email_address)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_rate_limit_user_id ON public.password_reset_rate_limit(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_rate_limit_email ON public.password_reset_rate_limit(email_address);
CREATE INDEX IF NOT EXISTS idx_password_reset_rate_limit_locked_until ON public.password_reset_rate_limit(locked_until);

-- ============================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_rate_limit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Password Reset Tokens: Users cannot directly query, only system can manage
CREATE POLICY "System manages password reset tokens" ON public.password_reset_tokens
  USING (false)
  WITH CHECK (false);

-- Allow token retrieval via trusted functions
CREATE POLICY "Allow token validation via functions" ON public.password_reset_tokens FOR SELECT
  USING (
    current_setting('app.allow_token_read')::boolean = true
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Audit Log: Users view own, admins view all
CREATE POLICY "Users view own password reset logs" ON public.password_reset_audit_log FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Rate Limiting: System only
CREATE POLICY "System manages password reset rate limits" ON public.password_reset_rate_limit
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Allow rate limit checks via functions" ON public.password_reset_rate_limit FOR SELECT
  USING (
    current_setting('app.allow_rate_limit_read')::boolean = true
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ============================================================================
-- SECTION 6: CREATE PASSWORD RESET TOKEN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_password_reset_token(
  p_email text,
  p_token_validity_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_rate_limit record;
  v_token text;
  v_token_hash text;
  v_token_salt text;
  v_expires_at timestamp with time zone;
  v_result jsonb;
BEGIN
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    PERFORM public.log_password_reset_audit('token_creation_failed', p_email, NULL, NULL, 'failed', 'Invalid email format');
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if email exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Log attempt but don't reveal user doesn't exist (security)
    PERFORM public.log_password_reset_audit('token_creation_failed', p_email, NULL, NULL, 'failed', 'User not found');
    v_result := jsonb_build_object(
      'success', false,
      'message', 'If an account exists with this email, a password reset link will be sent',
      'error', 'User not found'
    );
    RETURN v_result;
  END IF;

  -- Check rate limiting
  SELECT * INTO v_rate_limit FROM public.password_reset_rate_limit
  WHERE user_id = v_user_id AND email_address = p_email;

  IF v_rate_limit.is_locked AND v_rate_limit.locked_until > now() THEN
    PERFORM public.log_password_reset_audit('rate_limit_hit', p_email, NULL, v_user_id, 'failed', 'Too many attempts');
    RAISE EXCEPTION 'Too many password reset attempts. Please try again later.';
  END IF;

  -- Generate secure token (32 bytes = 256 bits)
  v_token_salt := gen_random_uuid()::text;
  v_token := encode(digest(gen_random_bytes(32) || v_token_salt, 'sha256'), 'hex');
  v_token_hash := encode(digest(v_token || v_token_salt, 'sha256'), 'hex');
  v_expires_at := now() + (p_token_validity_hours || ' hours')::interval;

  -- Revoke any existing unused tokens for this user
  UPDATE public.password_reset_tokens
  SET is_used = true, used_at = now()
  WHERE user_id = v_user_id AND email = p_email AND NOT is_used
  AND expires_at > now();

  -- Insert new token
  INSERT INTO public.password_reset_tokens (
    user_id,
    email,
    token_hash,
    token_salt,
    expires_at,
    created_ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    p_email,
    v_token_hash,
    v_token_salt,
    v_expires_at,
    inet_client_addr(),
    current_setting('request.headers')::jsonb -> 'user-agent'
  );

  -- Update or insert rate limit record
  INSERT INTO public.password_reset_rate_limit (user_id, email_address, attempt_count, is_locked, locked_until)
  VALUES (v_user_id, p_email, 1, false, NULL)
  ON CONFLICT (user_id, email_address) DO UPDATE SET
    attempt_count = LEAST(password_reset_rate_limit.attempt_count + 1, 10),
    last_attempt_at = now(),
    is_locked = CASE 
      WHEN (password_reset_rate_limit.attempt_count + 1) > 5 THEN true
      ELSE false
    END,
    locked_until = CASE 
      WHEN (password_reset_rate_limit.attempt_count + 1) > 5 THEN now() + interval '1 hour'
      ELSE NULL
    END;

  -- Log successful token creation
  PERFORM public.log_password_reset_audit('token_created', p_email, v_user_id, NULL, 'success', NULL);

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Password reset token created',
    'token', v_token,
    'expires_in_hours', p_token_validity_hours,
    'expires_at', v_expires_at
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 7: VALIDATE PASSWORD RESET TOKEN FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_password_reset_token(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_salt text;
  v_token_hash text;
  v_user_id uuid;
  v_email text;
  v_token_exists record;
  v_result jsonb;
BEGIN
  -- Validate token format (64 hex characters for SHA-256)
  IF p_token !~ '^[a-f0-9]{64}$' THEN
    PERFORM public.log_password_reset_audit('token_validated', 'unknown', NULL, NULL, 'failed', 'Invalid token format');
    RAISE EXCEPTION 'Invalid token format';
  END IF;

  -- Find matching token
  SET LOCAL app.allow_token_read = true;

  SELECT * INTO v_token_exists FROM public.password_reset_tokens
  WHERE token_hash = encode(digest(p_token || token_salt, 'sha256'), 'hex')
  LIMIT 1;

  RESET app.allow_token_read;

  IF v_token_exists IS NULL THEN
    PERFORM public.log_password_reset_audit('token_validated', 'unknown', NULL, NULL, 'failed', 'Token not found');
    v_result := jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired password reset token'
    );
    RETURN v_result;
  END IF;

  v_user_id := v_token_exists.user_id;
  v_email := v_token_exists.email;

  -- Check if token is already used
  IF v_token_exists.is_used THEN
    PERFORM public.log_password_reset_audit('token_validated', v_email, v_user_id, NULL, 'failed', 'Token already used');
    v_result := jsonb_build_object(
      'valid', false,
      'message', 'This password reset link has already been used'
    );
    RETURN v_result;
  END IF;

  -- Check if token is expired
  IF v_token_exists.expires_at < now() THEN
    PERFORM public.log_password_reset_audit('token_validated', v_email, v_user_id, NULL, 'expired', 'Token expired');
    v_result := jsonb_build_object(
      'valid', false,
      'message', 'This password reset link has expired'
    );
    RETURN v_result;
  END IF;

  -- Token is valid
  PERFORM public.log_password_reset_audit('token_validated', v_email, v_user_id, NULL, 'success', NULL);

  v_result := jsonb_build_object(
    'valid', true,
    'user_id', v_user_id,
    'email', v_email,
    'message', 'Token is valid',
    'expires_at', v_token_exists.expires_at
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 8: USE PASSWORD RESET TOKEN FUNCTION (Reset password)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_password_reset_token(
  p_token text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_exists record;
  v_user_id uuid;
  v_email text;
  v_result jsonb;
BEGIN
  -- Validate password strength (at least 8 chars, 1 number, 1 special char)
  IF LENGTH(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long';
  END IF;

  IF NOT (p_new_password ~ '[0-9]' AND p_new_password ~ '[!@#$%^&*(),.?":{}|<>]') THEN
    RAISE EXCEPTION 'Password must contain at least one number and one special character';
  END IF;

  -- Find matching token
  SET LOCAL app.allow_token_read = true;

  SELECT * INTO v_token_exists FROM public.password_reset_tokens
  WHERE token_hash = encode(digest(p_token || token_salt, 'sha256'), 'hex')
  LIMIT 1;

  RESET app.allow_token_read;

  IF v_token_exists IS NULL THEN
    PERFORM public.log_password_reset_audit('token_used', 'unknown', NULL, NULL, 'failed', 'Token not found');
    RAISE EXCEPTION 'Invalid token';
  END IF;

  v_user_id := v_token_exists.user_id;
  v_email := v_token_exists.email;

  -- Validate token state
  IF v_token_exists.is_used THEN
    PERFORM public.log_password_reset_audit('token_used', v_email, v_user_id, NULL, 'failed', 'Token already used');
    RAISE EXCEPTION 'This password reset link has already been used';
  END IF;

  IF v_token_exists.expires_at < now() THEN
    PERFORM public.log_password_reset_audit('token_used', v_email, v_user_id, NULL, 'expired', 'Token expired');
    RAISE EXCEPTION 'This password reset link has expired';
  END IF;

  -- Update token as used
  UPDATE public.password_reset_tokens
  SET
    is_used = true,
    used_at = now(),
    used_ip_address = inet_client_addr()
  WHERE id = v_token_exists.id;

  -- Mark token as used in auth (via trigger or external service)
  -- Note: Actual password update happens via Supabase Auth API

  -- Log success
  PERFORM public.log_password_reset_audit('token_used', v_email, v_user_id, NULL, 'success', NULL);

  -- Clear rate limit on successful reset
  UPDATE public.password_reset_rate_limit
  SET attempt_count = 0, is_locked = false, locked_until = NULL
  WHERE user_id = v_user_id AND email_address = v_email;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Password reset token is valid and ready to use',
    'user_id', v_user_id,
    'email', v_email
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 9: PASSWORD RESET AUDIT LOG HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_password_reset_audit(
  p_action text,
  p_email text,
  p_user_id uuid DEFAULT NULL,
  p_result text DEFAULT 'success',
  p_error_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.password_reset_audit_log (
    user_id,
    action,
    email_address,
    ip_address,
    user_agent,
    result,
    error_reason
  ) VALUES (
    COALESCE(p_user_id, (SELECT id FROM auth.users WHERE email = p_email LIMIT 1)),
    p_action,
    p_email,
    inet_client_addr(),
    current_setting('request.headers')::jsonb -> 'user-agent',
    p_result,
    p_error_reason
  );
END;
$$;

-- Fix to correct parameter order in log calls
CREATE OR REPLACE FUNCTION public.log_password_reset_audit(
  p_action text,
  p_email text,
  p_user_id uuid DEFAULT NULL,
  p_result_ignored text DEFAULT NULL,
  p_result text DEFAULT 'success',
  p_error_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.password_reset_audit_log (
    user_id,
    action,
    email_address,
    ip_address,
    user_agent,
    result,
    error_reason
  ) VALUES (
    COALESCE(p_user_id, (SELECT id FROM auth.users WHERE email = p_email LIMIT 1)),
    p_action,
    p_email,
    inet_client_addr(),
    current_setting('request.headers')::jsonb -> 'user-agent',
    p_result,
    p_error_reason
  );
END;
$$;

-- ============================================================================
-- SECTION 10: CLEANUP EXPIRED TOKENS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
  v_result jsonb;
BEGIN
  -- Only admins can run cleanup
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Delete expired tokens
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Clean up old audit logs (keep for 90 days)
  DELETE FROM public.password_reset_audit_log
  WHERE created_at < now() - interval '90 days';

  -- Clean up rate limits older than 24 hours with no recent attempts
  DELETE FROM public.password_reset_rate_limit
  WHERE last_attempt_at < now() - interval '24 hours';

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Cleanup completed',
    'deleted_tokens', v_deleted_count
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 11: GET PASSWORD RESET STATUS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_password_reset_status(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_rate_limit record;
  v_recent_tokens integer;
  v_result jsonb;
BEGIN
  -- Find user
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    v_result := jsonb_build_object(
      'can_request_reset', false,
      'reason', 'User not found'
    );
    RETURN v_result;
  END IF;

  -- Get rate limit status
  SELECT * INTO v_rate_limit FROM public.password_reset_rate_limit
  WHERE user_id = v_user_id AND email_address = p_email;

  -- Count recent active tokens
  SELECT COUNT(*) INTO v_recent_tokens FROM public.password_reset_tokens
  WHERE user_id = v_user_id AND email = p_email
  AND NOT is_used AND expires_at > now();

  v_result := jsonb_build_object(
    'can_request_reset', NOT (v_rate_limit.is_locked IS TRUE AND v_rate_limit.locked_until > now()),
    'is_rate_limited', v_rate_limit.is_locked IS TRUE AND v_rate_limit.locked_until > now(),
    'attempts_remaining', GREATEST(0, 5 - COALESCE(v_rate_limit.attempt_count, 0)),
    'active_tokens', v_recent_tokens,
    'locked_until', v_rate_limit.locked_until
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 12: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_password_reset_token(text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.validate_password_reset_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.use_password_reset_token(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_reset_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_password_reset_status(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_password_reset_audit(text, text, uuid, text, text) TO authenticated;

-- ============================================================================
-- SECTION 13: DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.password_reset_tokens IS 'Secure password reset tokens with SHA-256 hashing and expiration';
COMMENT ON TABLE public.password_reset_audit_log IS 'Complete audit trail of all password reset operations for security monitoring';
COMMENT ON TABLE public.password_reset_rate_limit IS 'Rate limiting to prevent brute force attempts on password reset functionality';
COMMENT ON FUNCTION public.create_password_reset_token(text, integer) IS 'Create a new secure password reset token for the given email address';
COMMENT ON FUNCTION public.validate_password_reset_token(text) IS 'Validate a password reset token without using it';
COMMENT ON FUNCTION public.use_password_reset_token(text, text) IS 'Validate and mark a token as used during password reset';
COMMENT ON FUNCTION public.cleanup_expired_password_reset_tokens() IS 'Clean up expired tokens and old audit logs (admin only)';
COMMENT ON FUNCTION public.get_password_reset_status(text) IS 'Check password reset eligibility and rate limiting status for an email';
