import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types for audit logs
export interface AuditLog {
  id: string;
  operation_type: 'CREDENTIAL_UPLOAD' | 'CREDENTIAL_APPROVE' | 'CREDENTIAL_REJECT' | 'CREDENTIAL_DELETE' | 'CREDENTIAL_VIEW' | 'DOCUMENT_DOWNLOAD';
  credential_id: string | null;
  teacher_id: string;
  admin_id: string | null;
  document_type: string;
  document_name: string;
  action_reason: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  is_sensitive: boolean;
}

export interface DeletionHistory {
  teacher_id: string;
  total_deletions: number;
  credential_deletions: number;
  most_recent_deletion: string | null;
  deleted_document_types: string[];
}

export interface SensitiveActivity {
  id: string;
  operation_type: string;
  teacher_id: string;
  admin_id: string | null;
  document_type: string;
  status: string;
  created_at: string;
  ip_address: string | null;
}

// Hook to fetch audit logs for a specific teacher
export function useTeacherAuditLogs(teacherId?: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        setLoading(true);
        const targetTeacherId = teacherId || user?.id;

        if (!targetTeacherId) {
          setError(new Error('No teacher ID provided'));
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('teacher_id', targetTeacherId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fetchError) throw fetchError;

        setLogs(data as AuditLog[]);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch audit logs');
        setError(error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, [teacherId, user?.id]);

  return { logs, loading, error };
}

// Hook to fetch deletion history for a specific teacher
export function useTeacherDeletionHistory(teacherId?: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<DeletionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDeletionHistory() {
      try {
        setLoading(true);
        const targetTeacherId = teacherId || user?.id;

        if (!targetTeacherId) {
          setError(new Error('No teacher ID provided'));
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('teacher_credential_deletion_history')
          .select('*')
          .eq('teacher_id', targetTeacherId)
          .single();

        if (fetchError) {
          // No deletion history (which is good)
          if (fetchError.code === 'PGRST116') {
            setHistory({
              teacher_id: targetTeacherId,
              total_deletions: 0,
              credential_deletions: 0,
              most_recent_deletion: null,
              deleted_document_types: [],
            });
          } else {
            throw fetchError;
          }
        } else {
          setHistory(data as DeletionHistory);
        }
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch deletion history');
        setError(error);
        setHistory(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDeletionHistory();
  }, [teacherId, user?.id]);

  return { history, loading, error };
}

// Hook to fetch credential deletion logs for a teacher
export function useCredentialDeletionLogs(teacherId?: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDeletionLogs() {
      try {
        setLoading(true);
        const targetTeacherId = teacherId || user?.id;

        if (!targetTeacherId) {
          setError(new Error('No teacher ID provided'));
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('teacher_id', targetTeacherId)
          .eq('operation_type', 'CREDENTIAL_DELETE')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        setLogs(data as AuditLog[]);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch deletion logs');
        setError(error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDeletionLogs();
  }, [teacherId, user?.id]);

  return { logs, loading, error };
}

// Hook to fetch all sensitive audit activity (admin use)
export function useSensitiveAuditActivity(limit: number = 100) {
  const [activity, setActivity] = useState<SensitiveActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSensitiveActivity() {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('sensitive_audit_activity')
          .select('*')
          .limit(limit);

        if (fetchError) throw fetchError;

        setActivity(data as SensitiveActivity[]);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch sensitive activity');
        setError(error);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSensitiveActivity();
  }, [limit]);

  return { activity, loading, error };
}

// Hook to check if a teacher has unusual deletion patterns
export function useTeacherDeletionPatterns(teacherId?: string, suspiciousDeletionThreshold: number = 3) {
  const { user } = useAuth();
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [deletionCount, setDeletionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function checkDeletionPatterns() {
      try {
        setLoading(true);
        const targetTeacherId = teacherId || user?.id;

        if (!targetTeacherId) {
          setError(new Error('No teacher ID provided'));
          return;
        }

        // Get deletion count in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error: fetchError, count } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .eq('teacher_id', targetTeacherId)
          .eq('operation_type', 'CREDENTIAL_DELETE')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (fetchError) throw fetchError;

        const recentDeletions = count || 0;
        setDeletionCount(recentDeletions);
        setIsSuspicious(recentDeletions >= suspiciousDeletionThreshold);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to check deletion patterns');
        setError(error);
        setIsSuspicious(false);
        setDeletionCount(0);
      } finally {
        setLoading(false);
      }
    }

    checkDeletionPatterns();
  }, [teacherId, user?.id, suspiciousDeletionThreshold]);

  return { isSuspicious, deletionCount, loading, error };
}

// Hook to fetch audit logs by operation type
export function useAuditLogsByOperation(operationType: AuditLog['operation_type'], limit: number = 100) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchLogsByOperation() {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('operation_type', operationType)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) throw fetchError;

        setLogs(data as AuditLog[]);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch audit logs');
        setError(error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLogsByOperation();
  }, [operationType, limit]);

  return { logs, loading, error };
}

// Utility function to create an audit log (if not using triggers)
export async function createAuditLog(
  operationType: AuditLog['operation_type'],
  credentialId: string | null,
  teacherId: string,
  documentType: string,
  documentName: string,
  actionReason?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLog | null> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        operation_type: operationType,
        credential_id: credentialId,
        teacher_id: teacherId,
        document_type: documentType,
        document_name: documentName,
        action_reason: actionReason || null,
        metadata: metadata || null,
        status: 'SUCCESS',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }

    return data as AuditLog;
  } catch (err) {
    console.error('Error creating audit log:', err);
    return null;
  }
}

// Utility function to format operation type for display
export function formatOperationType(operationType: AuditLog['operation_type']): string {
  const formatMap: Record<AuditLog['operation_type'], string> = {
    CREDENTIAL_UPLOAD: 'Credential Uploaded',
    CREDENTIAL_APPROVE: 'Credential Approved',
    CREDENTIAL_REJECT: 'Credential Rejected',
    CREDENTIAL_DELETE: 'Credential Deleted',
    CREDENTIAL_VIEW: 'Credential Viewed',
    DOCUMENT_DOWNLOAD: 'Document Downloaded',
  };

  return formatMap[operationType] || operationType;
}

// Utility function to get operation severity
export function getOperationSeverity(operationType: AuditLog['operation_type']): 'low' | 'medium' | 'high' {
  const severityMap: Record<AuditLog['operation_type'], 'low' | 'medium' | 'high'> = {
    CREDENTIAL_UPLOAD: 'low',
    CREDENTIAL_APPROVE: 'medium',
    CREDENTIAL_REJECT: 'high',
    CREDENTIAL_DELETE: 'high',
    CREDENTIAL_VIEW: 'low',
    DOCUMENT_DOWNLOAD: 'medium',
  };

  return severityMap[operationType] || 'low';
}
