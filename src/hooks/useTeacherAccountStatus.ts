import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatusType = "active" | "pending_verification" | "suspended" | "rejected";

export interface AccountStatus {
  status: AccountStatusType;
  reason?: string;
  message: string;
  icon: string;
  color: string;
}

export function useTeacherAccountStatus(userId: string | undefined) {
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAccountStatus = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        // Fetch teacher profile verification status
        const { data: teacherProfile, error: profileError } = await supabase
          .from("teacher_profiles")
          .select("verification_status")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        // Fetch profile to check if suspended/blocked
        const { data: profile, error: userError } = await supabase
          .from("profiles")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        if (userError) throw userError;

        // Determine status
        let status: AccountStatusType = "pending_verification";
        let message = "Your documents are being reviewed. This typically takes 24-48 hours.";
        let icon = "AlertTriangle";
        let color = "yellow";
        let reason: string | undefined;

        // Check if account is suspended or blocked
        if (profile?.status === "suspended" || profile?.status === "blocked") {
          status = "suspended";
          icon = "AlertCircle";
          color = "red";
          message = "Account Suspended. ";
          // Try to fetch suspension reason
          const { data: docs } = await supabase
            .from("verification_documents")
            .select("admin_notes")
            .eq("teacher_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (docs && docs[0]?.admin_notes) {
            reason = docs[0].admin_notes;
            message += `Reason: ${reason}. Please contact support.`;
          } else {
            message += "Please contact support.";
          }
        } else if (teacherProfile?.verification_status === "verified") {
          status = "active";
          icon = "CheckCircle";
          color = "green";
          message = "Congratulations! Your account is active and visible to students.";
        } else if (teacherProfile?.verification_status === "rejected") {
          status = "rejected";
          icon = "XCircle";
          color = "red";
          message = "Verification Failed. ";

          // Fetch rejection reason
          const { data: docs } = await supabase
            .from("verification_documents")
            .select("admin_notes")
            .eq("teacher_id", userId)
            .eq("status", "rejected")
            .limit(1);

          if (docs && docs[0]?.admin_notes) {
            reason = docs[0].admin_notes;
            message += `Reason: ${reason}. Please re-upload documents.`;
          } else {
            message += "Please re-upload documents.";
          }
        } else {
          // pending or not set
          status = "pending_verification";
          icon = "AlertTriangle";
          color = "yellow";
          message = "Your documents are being reviewed. This typically takes 24-48 hours.";
        }

        setAccountStatus({
          status,
          reason,
          message,
          icon,
          color,
        });
      } catch (err) {
        console.error("Error fetching account status:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch account status");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountStatus(true);

    // Realtime: when admin approves/rejects, teacher status updates live
    const channel = supabase
      .channel(`teacher-account-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchAccountStatus(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_documents",
          filter: `teacher_id=eq.${userId}`,
        },
        () => fetchAccountStatus(false)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchAccountStatus(false)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  return { accountStatus, loading, error };
}
