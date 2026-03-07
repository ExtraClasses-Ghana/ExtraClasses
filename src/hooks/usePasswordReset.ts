import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RpcResult<T> = { data: T | null; error: unknown };

type TableQuery = {
  select: (s?: string) => Promise<RpcResult<unknown>>;
  order: (col: string, opts?: { ascending?: boolean }) => TableQuery;
  limit: (n: number) => TableQuery;
  eq: (col: string, val: unknown) => TableQuery;
  update: (obj: Record<string, unknown>) => TableQuery;
  single: () => Promise<RpcResult<unknown>>;
};

const sb = supabase as unknown as {
  rpc: <T = unknown>(fn: string, args?: unknown) => Promise<RpcResult<T>>;
  from: (table: string) => TableQuery;
};

interface PasswordResetStatus {
  can_request_reset: boolean;
  is_rate_limited: boolean;
  attempts_remaining: number;
  active_tokens: number;
  locked_until: string | null;
}

interface TokenValidationResult {
  valid: boolean;
  user_id?: string;
  email?: string;
  message: string;
  expires_at?: string;
  error?: string;
}

/**
 * Hook to create password reset token
 */
export function usePasswordResetRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const requestReset = useCallback(async (email: string, tokenValidityHours: number = 24) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Supabase client typing may not include new RPC signatures in generated types
      // Use a narrow, local-typed result and guards to avoid widening the whole client to `any`
      const rpcResult = await sb.rpc<Record<string, unknown>>('create_password_reset_token', {
        p_email: email,
        p_token_validity_hours: tokenValidityHours,
      });

      const data = rpcResult?.data as unknown;
      const err = rpcResult?.error as unknown;

      if (err) throw err;

      if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
        const d = data as Record<string, unknown>;
        setSuccess(true);
        return { success: true, token: (d.token as string) || null, data: d };
      }

      const dRec = data as Record<string, unknown> | undefined;
      throw new Error((dRec?.error as string) || 'Failed to create reset token');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request password reset');
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return { requestReset, loading, error, success, reset };
}

/**
 * Hook to validate a password reset token
 */
export function usePasswordResetValidation() {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const validateToken = useCallback(async (token: string): Promise<TokenValidationResult> => {
    try {
      setValidating(true);
      setError(null);

      // Validate token format (should be 64 hex characters)
      const tokenRegex = /^[a-f0-9]{64}$/;
      if (!tokenRegex.test(token)) {
        return {
          valid: false,
          message: 'Invalid token format',
        };
      }

      const rpcResult = await sb.rpc<TokenValidationResult>('validate_password_reset_token', {
        p_token: token,
      });

      const data = rpcResult?.data as unknown;
      const err = rpcResult?.error as unknown;

      if (err) throw err;

      if (data && typeof data === 'object') {
        return data as TokenValidationResult;
      }

      return { valid: false, message: 'Token validation failed' };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Token validation error');
      setError(error);
      return { valid: false, message: 'Token validation error', error: error.message };
    } finally {
      setValidating(false);
    }
  }, []);

  return { validateToken, validating, error };
}

/**
 * Hook to complete password reset with new password
 */
export function usePasswordReset() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate password strength
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!/[0-9]/.test(newPassword)) {
        throw new Error('Password must contain at least one number');
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        throw new Error('Password must contain at least one special character');
      }

      const rpcResult = await sb.rpc<Record<string, unknown>>('use_password_reset_token', {
        p_token: token,
        p_new_password: newPassword,
      });

      const data = rpcResult?.data as unknown;
      const err = rpcResult?.error as unknown;

      if (err) throw err;

      if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
        const d = data as Record<string, unknown>;
        setSuccess(true);
        return { success: true, user_id: (d.user_id as string) || null, email: (d.email as string) || null };
      }

      const dRec = data as Record<string, unknown> | undefined;
      throw new Error((dRec?.message as string) || 'Failed to reset password');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Password reset failed');
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return { resetPassword, loading, error, success, reset };
}

/**
 * Hook to check password reset eligibility for an email
 */
export function usePasswordResetStatus() {
  const [status, setStatus] = useState<PasswordResetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkStatus = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      const rpcResult = await sb.rpc<PasswordResetStatus>('get_password_reset_status', {
        p_email: email,
      });

      const data = rpcResult?.data as unknown;
      const err = rpcResult?.error as unknown;

      if (err) throw err;

      if (data && typeof data === 'object') {
        setStatus(data as PasswordResetStatus);
        return data as PasswordResetStatus;
      }

      setStatus(null);
      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check reset status');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, error, checkStatus };
}

/**
 * Hook to get password reset audit logs
 */
export function usePasswordResetAuditLog() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAuditLog = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      setError(null);

      const res = await sb.from('password_reset_audit_log').order('created_at', { ascending: false }).limit(limit).select('*');

      if (res.error) throw res.error;

      setLogs((res.data as Record<string, unknown>[] ) || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch audit log');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  return { logs, loading, error, refetch: fetchAuditLog };
}

/**
 * Hook to manage password reset tokens (admin only)
 */
export function usePasswordResetTokenManagement() {
  const [tokens, setTokens] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTokens = useCallback(async (unusedOnly = true) => {
    try {
      setLoading(true);
      setError(null);

      let builder = sb.from('password_reset_tokens').order('created_at', { ascending: false });

      if (unusedOnly) {
        builder = builder.eq('is_used', false);
      }

      const res = await builder.select('*');

      if (res.error) throw res.error;

      setTokens((res.data as Record<string, unknown>[]) || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch tokens');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeToken = useCallback(async (tokenId: string) => {
    try {
      const res = await sb.from('password_reset_tokens').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', tokenId).select('*');

      if (res.error) throw res.error;

      // Refresh list
      await fetchTokens();
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke token');
      return { success: false, error };
    }
  }, [fetchTokens]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, error, revokeToken, refetch: fetchTokens };
}

/**
 * Hook to validate password strength
 */
export function usePasswordStrengthValidator() {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  const validatePassword = useCallback((password: string) => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const scoreCount = Object.values(requirements).filter(Boolean).length;
    setScore(scoreCount);

    const errors: string[] = [];
    if (!requirements.length) errors.push('Password must be at least 8 characters');
    if (!requirements.lowercase) errors.push('Add lowercase letters');
    if (!requirements.uppercase) errors.push('Add uppercase letters');
    if (!requirements.numbers) errors.push('Add numbers');
    if (!requirements.special) errors.push('Add special characters');

    setFeedback(errors);

    return {
      isValid: errors.length === 0,
      score: scoreCount,
      feedback: errors,
      requirements,
    };
  }, []);

  return { validatePassword, score, feedback };
}
