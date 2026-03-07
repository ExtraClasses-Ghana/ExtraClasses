import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface DashboardStats {
  total_teachers: number;
  total_students: number;
  new_students_today: number;
  new_students_this_week: number;
  total_revenue: number;
  active_sessions: number;
  completed_sessions: number;
  pending_verifications: number;
}

interface UseAdminDashboardStatsReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DEFAULT_STATS: DashboardStats = {
  total_teachers: 0,
  total_students: 0,
  new_students_today: 0,
  new_students_this_week: 0,
  total_revenue: 0,
  active_sessions: 0,
  completed_sessions: 0,
  pending_verifications: 0,
};

/**
 * Hook for fetching real-time admin dashboard statistics
 * 
 * Features:
 * - Fetches all statistics in a single database call via get_dashboard_stats_admin()
 * - Subscribes to real-time changes on relevant tables (user_roles, sessions, teacher_profiles)
 * - Provides loading and error states
 * - Includes manual refetch capability
 * 
 * Usage:
 * ```tsx
 * const { stats, loading, error } = useAdminDashboardStats();
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * 
 * return <div>Total Teachers: {stats?.total_teachers}</div>;
 * ```
 */
export function useAdminDashboardStats(): UseAdminDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Call the admin-gated RPC function
      const { data, error: rpcError } = await supabase.rpc(
        "get_dashboard_stats_admin"
      );

      if (rpcError) {
        throw new Error(
          rpcError.message || "Failed to fetch dashboard statistics"
        );
      }

      if (data) {
        // Transform RPC response to match our interface
        const stats = data as unknown as DashboardStats;
        const transformedStats: DashboardStats = {
          total_teachers: stats.total_teachers ?? 0,
          total_students: stats.total_students ?? 0,
          new_students_today: stats.new_students_today ?? 0,
          new_students_this_week: stats.new_students_this_week ?? 0,
          total_revenue: stats.total_revenue ?? 0,
          active_sessions: stats.active_sessions ?? 0,
          completed_sessions: stats.completed_sessions ?? 0,
          pending_verifications: stats.pending_verifications ?? 0,
        };

        setStats(transformedStats);
      } else {
        setStats(DEFAULT_STATS);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error fetching dashboard stats:", error);
      setError(error);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up real-time subscriptions
    const newChannels: RealtimeChannel[] = [];

    // Subscribe to user_roles changes (affects student/teacher counts)
    const userRolesChannel = supabase
      .channel("dashboard_user_roles_stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          console.debug("User roles changed, refetching dashboard stats");
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.debug("User roles subscription:", status);
      });

    newChannels.push(userRolesChannel);

    // Subscribe to sessions changes (affects revenue and session counts)
    const sessionsChannel = supabase
      .channel("dashboard_sessions_stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          console.debug("Sessions changed, refetching dashboard stats");
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.debug("Sessions subscription:", status);
      });

    newChannels.push(sessionsChannel);

    // Subscribe to teacher_profiles changes (affects verification and teacher counts)
    const teacherProfilesChannel = supabase
      .channel("dashboard_teacher_profiles_stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_profiles",
        },
        () => {
          console.debug("Teacher profiles changed, refetching dashboard stats");
          fetchStats();
        }
      )
      .subscribe((status) => {
        console.debug("Teacher profiles subscription:", status);
      });

    newChannels.push(teacherProfilesChannel);

    setChannels(newChannels);

    // Cleanup subscriptions on unmount
    return () => {
      newChannels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Alternative hook for fetching individual statistics
 * Use this if you only need specific metrics to reduce overhead
 * 
 * Usage:
 * ```tsx
 * const { count: totalTeachers } = useAdminDashboardMetric("total_teachers");
 * ```
 */
export function useAdminDashboardMetric(
  metric: keyof DashboardStats
): { count: number; loading: boolean; error: Error | null } {
  const { stats, loading, error } = useAdminDashboardStats();

  return {
    count: stats?.[metric] || 0,
    loading,
    error,
  };
}
