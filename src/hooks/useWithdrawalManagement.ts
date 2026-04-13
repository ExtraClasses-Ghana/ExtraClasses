import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WithdrawalRequest {
  withdrawal_id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  method: string;
  payment_method?: string;
  mobile_network?: string;
  bank_name?: string;
  account_number?: string;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  completed_at?: string;
  transaction_count: number;
  last_transaction_type?: string;
  last_transaction_at?: string;
}

export interface WithdrawalTransaction {
  id: string;
  withdrawal_id: string;
  teacher_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  transaction_status: string;
  payment_gateway?: string;
  reference_number?: string;
  external_reference?: string;
  error_message?: string;
  metadata: Record<string, string | number | boolean | null | Record<string, unknown>>;
  created_at: string;
  processed_at?: string;
}

export interface WithdrawalNotification {
  notification_id: string;
  withdrawal_id: string;
  teacher_name: string;
  amount: number;
  currency: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface WithdrawalStats {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_completed: number;
  total_amount: number;
  average_amount: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  completed_count: number;
}

export interface WithdrawalTrend {
  date: string;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  completed_count: number;
  total_amount: number;
}

// Hook for fetching withdrawal requests
export function useAdminWithdrawals(
  limit: number = 50,
  offset: number = 0,
  filterStatus?: string,
  filterMethod?: string
) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rpcParams: Record<string, any> = {
        limit_count: limit,
        offset_count: offset,
      };

      if (filterStatus) rpcParams.filter_status = filterStatus;
      if (filterMethod) rpcParams.filter_method = filterMethod;

      const { data, error: err } = await supabase.rpc(
        'get_admin_withdrawals_list' as any,
        rpcParams as any
      );

      if (err) throw err;
      setWithdrawals((data as WithdrawalRequest[]) || []);
    } catch (err: Error | unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
      const message = error.message || 'Failed to fetch withdrawals';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [limit, offset, filterStatus, filterMethod, toast]);

  useEffect(() => {
    fetchWithdrawals();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-withdrawals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_withdrawals',
        },
        () => fetchWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWithdrawals]);

  return { withdrawals, loading, error, refetch: fetchWithdrawals };
}

// Hook for withdrawal actions
export function useWithdrawalActions() {
  const { toast } = useToast();

  const approveWithdrawal = useCallback(
    async (withdrawalId: string, approvalNotes?: string) => {
      try {
        // @ts-ignore
        const { data, error: err } = await supabase.rpc('approve_withdrawal', {
          withdrawal_id: withdrawalId,
          approval_notes: approvalNotes || null,
        });

        if (err) throw err;

        toast({
          title: 'Success',
          description: 'Withdrawal approved successfully',
        });

        return { success: true, data };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to approve withdrawal';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );

  const rejectWithdrawal = useCallback(
    async (withdrawalId: string, rejectionReason: string) => {
      if (!rejectionReason.trim()) {
        toast({
          title: 'Error',
          description: 'Rejection reason is required',
          variant: 'destructive',
        });
        return { success: false, error: 'Rejection reason required' };
      }

      try {
        // @ts-ignore
        const { data, error: err } = await supabase.rpc('reject_withdrawal', {
          withdrawal_id: withdrawalId,
          rejection_reason: rejectionReason,
        });

        if (err) throw err;

        toast({
          title: 'Success',
          description: 'Withdrawal rejected successfully',
        });

        return { success: true, data };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to reject withdrawal';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );

  const processWithdrawal = useCallback(
    async (
      withdrawalId: string,
      paymentGateway?: string,
      referenceNumber?: string
    ) => {
      try {
        // @ts-ignore
        const { data, error: err } = await supabase.rpc('process_withdrawal', {
          withdrawal_id: withdrawalId,
          payment_gateway: paymentGateway || null,
          reference_number: referenceNumber || null,
        });

        if (err) throw err;

        toast({
          title: 'Success',
          description: 'Withdrawal processing started',
        });

        return { success: true, data };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to process withdrawal';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );

  const completeWithdrawal = useCallback(
    async (withdrawalId: string, externalReference?: string) => {
      try {
        // @ts-ignore
        const { data, error: err } = await supabase.rpc('complete_withdrawal', {
          withdrawal_id: withdrawalId,
          external_reference: externalReference || null,
        });

        if (err) throw err;

        toast({
          title: 'Success',
          description: 'Withdrawal completed successfully',
        });

        return { success: true, data };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to complete withdrawal';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );

  const updateWithdrawalStatus = useCallback(
    async (withdrawalId: string, newStatus: string) => {
      try {
        const { error: err } = await (supabase as any)
          .from('teacher_withdrawals')
          .update({ status: newStatus })
          .eq('id', withdrawalId);

        if (err) throw err;

        toast({
          title: 'Success',
          description: `Withdrawal status updated to ${newStatus}`,
        });

        return { success: true };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
        const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to update withdrawal status';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );
  
  const deleteWithdrawal = useCallback(
    async (withdrawalId: string) => {
      try {
        const { error: err } = await supabase
          .from('teacher_withdrawals')
          .delete()
          .eq('id', withdrawalId);

        if (err) throw err;

        toast({
          title: 'Success',
          description: 'Withdrawal request securely deleted.',
        });

        return { success: true };
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
        const error = err instanceof Error ? err : new Error(errorMsg);
        const message = error.message || 'Failed to delete withdrawal';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      }
    },
    [toast]
  );

  return {
    approveWithdrawal,
    rejectWithdrawal,
    processWithdrawal,
    completeWithdrawal,
    updateWithdrawalStatus,
    deleteWithdrawal,
  };
}

// Hook for withdrawal statistics
export function useWithdrawalStats() {
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // @ts-ignore
      const { data, error: err } = await supabase.rpc('get_withdrawal_statistics');

      if (err) throw err;

      if (data && (data as any[]).length > 0) {
        setStats((data as any[])[0]);
      }
    } catch (err: Error | unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
      const message = error.message || 'Failed to fetch statistics';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('withdrawal-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_withdrawals',
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, error };
}

// Hook for withdrawal notifications
export function useWithdrawalNotifications() {
  const [notifications, setNotifications] = useState<WithdrawalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc(
        'get_admin_withdrawal_notifications' as any,
        {
          admin_id: null,
          limit_count: 50,
          offset_count: 0,
        } as any
      );

      if (err) throw err;
      setNotifications((data as WithdrawalNotification[]) || []);
    } catch (err: Error | unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
      const message = error.message || 'Failed to fetch notifications';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        // @ts-ignore
        const { error: err } = await supabase.rpc('mark_notification_read', {
          notification_id: notificationId,
        });

        if (err) throw err;

        setNotifications((prev) =>
          prev.map((notif) =>
            notif.notification_id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
      } catch (err: Error | unknown) {
        const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
        console.error('Failed to mark notification as read:', error);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('withdrawal-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawal_notifications',
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return { notifications, loading, error, markAsRead };
}

// Hook for withdrawal trends
export function useWithdrawalTrends(daysBack: number = 30) {
  const [trends, setTrends] = useState<WithdrawalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // @ts-ignore
      const { data, error: err } = await supabase.rpc('get_withdrawal_trends', {
        days_back: daysBack,
      });

      if (err) throw err;
      setTrends((data as WithdrawalTrend[]) || []);
    } catch (err: Error | unknown) {
      const errorMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : String(err);
      const error = err instanceof Error ? err : new Error(errorMsg);
      const message = error.message || 'Failed to fetch trends';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [daysBack, toast]);

  useEffect(() => {
    fetchTrends();

    const channel = supabase
      .channel('withdrawal-trends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_withdrawals',
        },
        () => fetchTrends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends]);

  return { trends, loading, error };
}
