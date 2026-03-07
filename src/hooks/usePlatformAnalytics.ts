import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudentDemographic {
  education_level: string | null;
  student_count: number;
  new_students_today: number;
  new_students_week: number;
}

export interface RevenueTrend {
  trend_label: string;
  revenue: number;
  session_count: number;
  avg_session_value: number;
}

export interface SubjectDistribution {
  subject_name: string;
  teacher_count: number;
  avg_hourly_rate: number;
  total_revenue: number;
  completed_sessions: number;
}

/**
 * Hook for fetching student demographics by education level
 */
export function useStudentDemographics() {
  const [demographics, setDemographics] = useState<StudentDemographic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDemographics = async () => {
      try {
        setError(null);
        const { data, error: rpcError } = await supabase.rpc(
          "get_student_demographics_admin"
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setDemographics((data as unknown as StudentDemographic[]) || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Error fetching student demographics:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDemographics();
  }, []);

  return { demographics, loading, error };
}

/**
 * Hook for fetching revenue trends
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param duration - number of days/weeks/months to fetch
 */
export function useRevenueTrends(period: "daily" | "weekly" | "monthly" = "daily", duration: number = 30) {
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setError(null);
        const { data, error: rpcError } = await supabase.rpc(
          "get_revenue_trends_admin",
          {
            period,
            days_or_weeks_or_months: duration,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setTrends((data as unknown as RevenueTrend[]) || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Error fetching revenue trends:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [period, duration]);

  return { trends, loading, error };
}

/**
 * Hook for fetching subject-teacher distribution
 */
export function useSubjectDistribution() {
  const [distribution, setDistribution] = useState<SubjectDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        setError(null);
        const { data, error: rpcError } = await supabase.rpc(
          "get_subject_distribution_admin"
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setDistribution((data as unknown as SubjectDistribution[]) || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Error fetching subject distribution:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, []);

  return { distribution, loading, error };
}
