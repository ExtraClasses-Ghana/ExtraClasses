import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStudent {
  user_id: string;
  full_name: string;
  email: string;
  education_level: string | null;
  is_suspended: boolean;
  is_blocked: boolean;
  suspension_reason: string | null;
  block_reason: string | null;
  suspension_date: string | null;
  block_date: string | null;
  created_at: string;
  total_sessions: number;
  total_spent: number;
  last_active: string | null;
}

export interface AdminActionResult {
  success: boolean;
  message: string;
  user_id: string;
  [key: string]: string | number | boolean;
}

/**
 * Hook for fetching admin students list
 */
export function useAdminStudents(
  limit: number = 50,
  offset: number = 0,
  filterStatus: string | null = null
) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setError(null);
        const { data, error: rpcError } = await supabase.rpc(
          "get_admin_students_list",
          {
            limit_count: limit,
            offset_count: offset,
            filter_status: filterStatus,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setStudents((data as unknown as AdminStudent[]) || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Error fetching admin students:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [limit, offset, filterStatus]);

  return { students, loading, error };
}

/**
 * Hook for performing admin actions on students
 */
export function useStudentActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Suspend a student account
   */
  const suspendStudent = async (
    studentId: string,
    reason: string = "No reason provided"
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "suspend_student_admin",
        {
          target_user_id: studentId,
          suspension_reason: reason,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return data as AdminActionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error suspending student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unsuspend a student account
   */
  const unsuspendStudent = async (
    studentId: string
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "unsuspend_student_admin",
        {
          target_user_id: studentId,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return data as AdminActionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error unsuspending student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Block a student account
   */
  const blockStudent = async (
    studentId: string,
    reason: string = "No reason provided"
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "block_student_admin",
        {
          target_user_id: studentId,
          block_reason: reason,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return data as AdminActionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error blocking student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unblock a student account
   */
  const unblockStudent = async (
    studentId: string
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "unblock_student_admin",
        {
          target_user_id: studentId,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return data as AdminActionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error unblocking student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a student account
   */
  const deleteStudent = async (
    studentId: string,
    reason: string = "Account deletion requested"
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "delete_student_account_admin",
        {
          target_user_id: studentId,
          reason: reason,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return data as AdminActionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error deleting student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Message a student (placeholder for messaging system)
   */
  const messageStudent = async (
    studentId: string,
    message: string,
    subject: string = "Admin Message"
  ): Promise<AdminActionResult | null> => {
    try {
      setLoading(true);
      setError(null);

      // Placeholder implementation - messaging system to be integrated later
      console.info("Message sent to student", {
        studentId,
        subject,
        message,
      });

      return {
        success: true,
        message: "Message sent successfully",
        user_id: studentId,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      console.error("Error messaging student:", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    suspendStudent,
    unsuspendStudent,
    blockStudent,
    unblockStudent,
    deleteStudent,
    messageStudent,
  };
}
